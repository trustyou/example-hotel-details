(function($, Mustache) {
	"use strict";

	var hotelData = {
		name: "Bellagio Las Vegas",
		address: "South Las Vegas Boulevard 3600, NV 89109, Las Vegas, USA",
		tyId: "674fa44c-1fbd-4275-aa72-a20f262372cd",
		imgUrl: "img/674fa44c-1fbd-4275-aa72-a20f262372cd.jpg"
	};

	var languageNames = {
		en: "English",
		de: "German",
		fr: "French",
		es: "Spanish",
		it: "Italian",
		pt: "Portuguese",
		nl: "Dutsch",
		ru: "Russian",
		pl: "Polish",
		zh: "Chinese",
		ja: "Japanese",
		th: "Thai",
		id: "Indonesian",
		ko: "Korean",
		ar: "Arabic",
		sv: "Swedish",
		no: "Norwegian",
		fi: "Finnish",
		he: "Hebrew"
	};

	/*
	When querying a JSON widget, always ask for the specific version you
	developed against. This guarantees that no schema-breaking changes will
	affect your code.
	*/
	var url = "https://api.trustyou.com/hotels/" + hotelData.tyId + "/meta_review.json?" + $.param({
		lang: "en",
		/*
		This is a demo API key, do not reuse it! Contact TrustYou to
		receive your own.
		*/
		key: "a06294d3-4d58-45c8-97a1-5c905922e03a",
		v: "5.39"
	});
	var reviewSummaryRequest = $.ajax({
		url: url,
		// Usage of JSONP is not required for server-side calls
		dataType: "jsonp"
	}).fail(function() {
		throw "API request failed!";
	});

	/**
	* Render the hotel title, address & rating.
	*/
	function renderHotelTitle(hotelData, reviewSummary) {
		var hotelTitlteTemplate = $("#tmpl-hotel-title").html();
		var templateData = {
			name: hotelData.name,
			address: hotelData.address,
			reviewsCount: reviewSummary["reviews_count"],
			trustScore: reviewSummary["summary"].score,
		};

		var hotelTitleRendered = Mustache.render(hotelTitlteTemplate, templateData);
		$("#hotel-title").append(hotelTitleRendered);
	}

	/**
	* Render the basic hotel info.
	*/
	function renderHotelInfo(hotelData, reviewSummary) {
		var hotelInfoTemplate = $("#tmpl-hotel-info").html();
		var templateData = {
			name: hotelData.name,
			address: hotelData.address,
			imgUrl: hotelData.imgUrl,
			reviewsCount: reviewSummary["reviews_count"],
			trustScore: reviewSummary["summary"].score,
			popularity: reviewSummary["summary"].popularity,
			summary: reviewSummary["summary"].text
		};

		// transform hotel types to the format expected by the template
		templateData.badges = reviewSummary["badge_list"]
		.slice(1, 3)
		.map(function(badge) {
			return {
				categoryId: badge["badge_data"]["category_id"],
				text: badge["text"],
				subtext: badge["subtext"]
			};
		});

		// transform hotel star distribution
		templateData.reviewsDistribution = reviewSummary["summary"]["reviews_distribution"]
		.reverse()
		.map(function(starBin) {
			return {
				reviewsCount: starBin["reviews_count"],
				stars: starBin["stars"],
				// we will color 4 & 5 green, 3 yellow, and 1 & 2 red
				sentiment: starBin["stars"] >= 4 ? "pos" : (starBin["stars"] <= 2 ? "neg" : "neu"),
				// divide the reviews count for this bin by the
				// total count to obtain a relative percentage
				percent: 100 * starBin["reviews_count"] / reviewSummary["reviews_count"]
			};
		});

		var hotelInfoRendered = Mustache.render(hotelInfoTemplate, templateData);
		$("#hotel-info").append(hotelInfoRendered);
	}

	/**
	* Prepare data from meta-review API to be displayed in the Mustache
	template. This method is called repeatedly, once for the overall meta-
	review, and once for each language-specific meta-review.
	*/
	function prepareTemplateData(reviewSummary) {
		var templateData = {};

		if (reviewSummary.hasOwnProperty("filter")) {
			/*
			This is a language-specific meta-review, i.e. only from
			reviews written in a certain language.
			*/
			templateData = {
				language: reviewSummary["filter"]["language"],
				label: languageNames[reviewSummary["filter"]["language"]],
				reviewsPercent: reviewSummary["reviews_percent"],
				travelerTypes: null,
				visibility: ""
			};
		} else {
			/*
			This is the overall meta-review, visible by default.
			*/
			templateData = {
				language: "all",
				label: "All languages",
				reviewsPercent: 100,
				travelerTypes: true,
				visibility: "in active"
			};
		}

		/*
		For this visualization, we will visualize the top 5 most
		frequent categories. For this, they are sorted by their "count"
		property.
		*/
		var categories = reviewSummary["category_list"].sort(function(catA, catB) {
			return catB["count"] - catA["count"];
		});
		/*
		Remove the overall sentiment category with ID "16" - these
		opinions are a bit too generic for this visualization.
		*/
		categories = categories.filter(function(category) {
			return category["category_id"] !== "16";
		});
		categories = categories.slice(0, 5);

		templateData.categories = categories.map(function(category, index) {
			return {
				// activate the first category in the list
				"class": index === 0 ? "in active" : "",
				categoryId: category["category_id"],
				categoryName: category["category_name"],
				sentiment: category["sentiment"],
				/*
				Show category summary sentences.
				*/
				summarySentences: category["summary_sentence_list"].map(function(summarySentence) {
					return {
						sentiment: (summarySentence["sentiment"] == "neg" ? "remove" : "ok"),
						text: summarySentence["text"]
					};
				})
			};
		});

		/*
		Display the "good to know" categories in a separate section.
		*/
		templateData.goodToKnow = reviewSummary["good_to_know_list"].map(function(goodToKnow) {
			return {
				/*
				Show a positive icon for positive sentiment,
				negative otherwise.
				*/
				sentiment: goodToKnow["sentiment"] === "pos" ? "ok" : "remove",
				text: goodToKnow["short_text"]
			};
		});

		return templateData;
	}

	/**
	* Render the review summary.
	*/
	function renderReviewsTab(reviewSummary) {
		var reviewsTabTemplate = $("#tmpl-reviews-tab").html();

		// Transform the overall meta-review to the format expected
		// by the template ...
		var metaReviews = [prepareTemplateData(reviewSummary)]
		// ... append all language meta-reviews ...
		.concat(
			reviewSummary["language_meta_review_list"].map(prepareTemplateData)
		)
		// ... sort them by descending reviews count, and ...
		.sort(function(templateDataA, templateDataB) {
			return templateDataB.reviewsPercent - templateDataA.reviewsPercent;
		});
		// ... display them!

		var templateData = {
			languageMetaReviews: metaReviews
		};
		var reviewsTabRendered = Mustache.render(reviewsTabTemplate, templateData);
		$("#review-summary").append(reviewsTabRendered);

	}

	function renderLocationTab(hotelData) {
		var iframeUrl = "https://api.trustyou.com/hotels/" + hotelData.tyId  + "/location.html";
		$("#iframe-location").attr("src", iframeUrl);
	}

	/**
	 * Render the social tab.
	 */
	 function renderSocialTab(hotelData) {
		var iframeUrl = "https://api.trustyou.com/hotels/" + hotelData.tyId  + "/social.html";
		$("#iframe-social").attr("src", iframeUrl);
	}

	/**
	Process a response from the TrustYou Review Summary API.
	*/
	function processReviewSummaryResponse(data) {
		// check whether the API request was successful
		if (data.meta.code !== 200) {
			throw "API request failed!";
		}
		var reviewSummary = data.response;
		renderHotelTitle(hotelData, reviewSummary);
		renderHotelInfo(hotelData, reviewSummary);
		renderReviewsTab(reviewSummary);
		renderLocationTab(hotelData);
		renderSocialTab(hotelData);
	}

	// when the DOM is ready for rendering, process the API response
	$(function() {
		reviewSummaryRequest.done(processReviewSummaryResponse);

		// when a review language is selected within the reviews tab
		$(document).on('shown.bs.tab', '.traveler-language a[data-toggle="tab"]',function (e) {
			
			// remove active class from all dropdown languages
			$(this).parents('li').siblings().removeClass('active');
			
			// activate newly selected language
			$(this).parents('li').addClass('active');

			// update text for dropdown toggle
			$(this).parents('.dropdown').find('[data-toggle="dropdown"] .language-type').html($(this).find('.language-type').text());
			$(this).parents('.dropdown').find('[data-toggle="dropdown"] .value').html($(this).find('.value').text());
		
		});
	});

}($, Mustache));

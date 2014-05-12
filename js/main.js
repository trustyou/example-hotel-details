(function($, Mustache) {
	"use strict";

	var hotelData = {
		name: "Bellagio Las Vegas",
		address: "South Las Vegas Boulevard 3600, NV 89109, Las Vegas, USA",
		tyId: "674fa44c-1fbd-4275-aa72-a20f262372cd",
		imgUrl: "img/674fa44c-1fbd-4275-aa72-a20f262372cd.jpg"
	};

	/*
	When querying a JSON widget, always ask for the specific version you
	developed against. This guarantees that no schema-breaking changes will
	affect your code.
	*/
	var url = "http://api.trustyou.com/hotels/" + hotelData.tyId + "/tops_flops.json?" + $.param({
		lang: "en",
		/*
		This is a demo API key, do not reuse it! Contact TrustYou to
		receive your own.
		*/
		key: "a06294d3-4d58-45c8-97a1-5c905922e03a",
		v: "5.16",
		/*
		Pass detail=all to receive all categories and sub categories
		present in this hotel's data.
		*/
		detail: "all"
	});
	var reviewSummaryRequest = $.ajax({
		url: url,
		// Usage of JSONP is not required for server-side calls
		dataType: "jsonp"
	}).fail(function() {
		throw "API request failed!";
	});


    /*
    Call the social api
    */
    var socialUrl = "http://api.trustyou.com/hotels/" + hotelData.tyId + "/social.json?" + $.param({
        page_size: 2, // we ask for the most recent two posts
        lang_list: ["en"]
    });
	var socialRequest = $.ajax({
		url: socialUrl,
		dataType: "jsonp"
	}).fail(function() {
		throw "Social API request failed!";
	});

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
		templateData.hotelTypes = reviewSummary["hotel_type_list"].map(function(hotelType) {
			return {
				categoryId: hotelType["category_id"],
				/*
				Texts in the "text" property contain markers
				in the form of <pos>..</pos>, <neg>..</neg> and
				<neu>..</neu>, which enclose passages in the
				text that contain sentiment. Either remove
				these before displaying the text, or replace
				them with meaningful markup, as is done here.
				*/
				text: hotelType["text"].replace("<pos>", "<strong>").replace("</pos>", "</strong>")
			};
		});

		var hotelInfoRendered = Mustache.render(hotelInfoTemplate, templateData);
		$("#hotel-info").append(hotelInfoRendered);
	}

	/**
	* Render the review summary.
	*/
	function renderReviewsTab(reviewSummary) {
		var reviewsTabTemplate = $("#tmpl-reviews-tab").html();
		var templateData = {};

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
				Show up to three returned highlights. If no
				highlights are present, the "short_text" is
				shown instead, which is guaranteed to be there
				for all category-language combinations.
				*/
				highlights: category["highlight_list"].concat({text: category["short_text"]}).slice(0, 3),
				/*
				Transform sub categories into the format
				expected by the template. Order by sentiment
				from positive to negative this time.
				*/
				subCategories: category["sub_category_list"].sort(function(catA, catB) {
					return catB["score"] - catA["score"];
				}).map(function(subCategory) {
					return {
						sentiment: subCategory["sentiment"],
						/*
						Remove the markers in the form of
						<pos>..</pos>, <neg>..</neg> and
						<neu>..</neu> with a regular
						expression.
						*/
						text: subCategory["text"].replace(/<\/?(?:pos|neu|neg)>/g, ''),
						score: subCategory["score"]
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

		var reviewsTabRendered = Mustache.render(reviewsTabTemplate, templateData);
		$("#review-summary").append(reviewsTabRendered);

	}

    function renderLocationTab(hotelData) {
        var iframeUrl = "http://api.trustyou.com/hotels/" + hotelData.tyId  + "/location.html";
        $("#iframe-location").attr("src", iframeUrl);
    }

	/**
	 * Render the social tab.
	 */
    function renderSocialTab(socialData) {
        var socialTabTemplate = $("#tmpl-social-tab").html();

        /**
         * Map the source url to css class
         */
        var getSourceIconClass = function(sourceID) {
            if (sourceID === "google.com") { return "google-plus"; }
            else {
                var urlElems = sourceID.split(".");
                return urlElems[urlElems.length-2];
            }
        };

        /**
         * Format post date to month/date/year
         */
        var fromDateString = function(dateString) {
            var parts = dateString.split("-");
            var d = new Date(parts[0], parts[1]-1, parts[2]);
            return [d.getMonth() + 1, d.getDate(), d.getFullYear()].join("/");
        };

        var templateData = {

            /**
             * For each social source, create a new section.
             */
            sources: socialData["source_list"].map(function(sourceData) {
                var sourceIconClass = getSourceIconClass(sourceData.source_id);
                return {
                    socialSource: sourceIconClass,

                    posts: sourceData["post_list"].filter(function(postData) {
                        /**
                         * We will only show google plus or foursquare posts here.
                         */
                        return (postData.source_id === "google.com" ||
                                postData.source_id === "foursquare.com");
                    }).map(function(postData) {
                        /**
                         * Turn social posts into format for the template.
                         */
                        return {
                            socialSourceClass: sourceIconClass,
                            socialSource: postData.source_name,
                            publishDate: fromDateString(postData.created),
                            text: postData.text,
                            // show a source-specific default user name if
                            // author field is null
                            userName: postData.author
                                || ("A " + postData.source_name + " user")
                        };
                    })
                };
            })
        };

        var socialRendered = Mustache.render(socialTabTemplate, templateData);
        $("#social").append(socialRendered);
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
		renderHotelInfo(hotelData, reviewSummary);
		renderReviewsTab(reviewSummary);
        renderLocationTab(hotelData);
	}

    function processSocialResponse(data) {
        if (data.meta.code !== 200) {
			throw "Social widget request failed!";
		}
        var socialData = data.response;
        renderSocialTab(socialData);
    }

	// when the DOM is ready for rendering, process the API response
	$(function() {
		reviewSummaryRequest.done(processReviewSummaryResponse);
        socialRequest.done(processSocialResponse);
	});

}($, Mustache));

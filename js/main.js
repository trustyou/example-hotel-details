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
		detail: "all"
	});
	var request = $.ajax({
		url: url,
		// Usage of JSONP is not required for server-side calls
		dataType: "jsonp"
	}).fail(function() {
		throw "API request failed!";
	});

	// when the DOM is ready for rendering, process the API response
	$(function() {
		request.done(processApiResponse);
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
	Process a response from the TrustYou Review Summary API.
	*/
	function processApiResponse(data) {
		// check whether the API request was successful
		if (data.meta.code !== 200) {
			throw "API request failed!";
		}
		var reviewSummary = data.response;
		renderHotelInfo(hotelData, reviewSummary);
	}

})($, Mustache);

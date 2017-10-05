/**
 * Created by filip on 15-03-10.
 */
$(function() {


	$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
		event.preventDefault();
		$(this).ekkoLightbox();
	});
});

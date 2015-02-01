(function($) {
    // Add events for show and hide.
    $.each(['show', 'hide'], function (i, ev) {
        var el = $.fn[ev];
        $.fn[ev] = function () {
            this.trigger(ev);
            return el.apply(this, arguments);
        };
    });

    $.fn.slideshow = function(options) {
        // Handle multiple matches
        if (this.length > 1) {
            this.each(function(){
                $(this).slideshow(options);
            });
        }

        var slideshow = this; page_index = 0;
        var $container, $pages, $current_page;
        var skip_timeout, pages;

        // DEFAULT SETTINGS ===============================
        var defaults = {
            auto_play: false,
            auto_play_delay: 3000,
            auto_play_direction: 'forwards', // backwards or alternate, alternate reverses direction when it gets to the end
        };
        // ================================================

        var settings = $.extend(defaults, options);

        // PRIVATE FUNCTIONS ==============================
        var init = function() {
            $container = $(slideshow);
            $container.css({
                'position': 'relative'
            });

            $pages = $container.find('.page');
            $pages.css({
                'display': 'none',
                'width': '100%',
                'top': '0px',
                'left': '0px',
            });

            apply_auto_play();

            return slideshow;
        }

        var apply_auto_play = function() {
            if (settings.auto_play_direction == 'forwards' || settings.auto_play_direction == 'alternate') {
                settings.play_reverse = false;
            } else {
                settings.play_reverse = true;
            }
        }

        var set_page_by_id = function(page_id) {
            set_page_by_index($pages.filter(page_id).index())
        }

        var set_page_by_index = function(index) {
            slideshow.clear_skip_timeout();
            page_index = index % $pages.length;
            if ($current_page) {
                // Fade out old page and call its on_hide callback
                // before setting and showing new page.
                $current_page.fadeOut(show_page);
            } else {
                // At the start $current_page is null so there is nothing to fade out.
                show_page();
            }
        }

        var show_page = function() {
            $current_page = $pages.eq(page_index);
            $current_page.fadeIn(auto_play);
        }

        var auto_play = function() {
            if (settings.auto_play) {
                // Reverse animation if need be...
                // That is when auto_play_direction is set to alternate
                // So it reverses every time it gets to the end instead of loooping over
                if (settings.auto_play_direction == 'alternate') {
                    if (page_index == 0 || page_index == ($pages.length - 1)) {
                        settings.play_reverse = !settings.play_reverse;
                    }
                }

                // set the timeout
                slideshow.set_skip_timeout(settings.auto_play_delay, settings.play_reverse);
            }
        }
        // ================================================

        // PUBLIC FUNCTIONS ===============================
        this.next_page = function() {
            set_page_by_index(page_index + 1);
        }

        this.prev_page = function() {
            set_page_by_index(page_index - 1);
        }

        this.set_page = function(target_page) {
            // Calls the appropriate set_page function based on whether
            // the page is identified with '#id' or its index
            if (typeof target_page == 'string') {
                set_page_by_id(target_page);
            } else if (typeof target_page == 'number') {
                set_page_by_index(target_page);
            }
        }

        this.set_skip_timeout = function(delay, play_reverse) {
            // Sets the skip_timeout in the given direction
            if (!play_reverse){
                skip_timeout = setTimeout(slideshow.next_page, delay);
            } else {
                skip_timeout = setTimeout(slideshow.prev_page, delay);
            }
        }

        this.clear_skip_timeout = function() {
            clearTimeout(skip_timeout);
        }

        this.stop = function() {
            slideshow.clear_skip_timeout();
            settings.auto_play = false;
        }

        this.start = function(auto_play_options) {
            settings = $.extend(settings, auto_play_options);
            apply_auto_play();

            settings.auto_play = true;
            auto_play();
        }
        
        this.add_page = function(page_markup) {
            // This function is for dynamically adding pages with ajax for example.
            // You can only append pages to the end so you don't mess with the indexes.
            var $new_page = $(page_markup);
            $new_page.addClass('page');
            $new_page.css({
                'display': 'none',
                'width': '100%',
                'top': '0px',
                'left': '0px',
            });
            
            $container.append($new_page);
            $pages = $container.find('.page');
        }
        
        // ================================================

        return init();
    }
})(jQuery);

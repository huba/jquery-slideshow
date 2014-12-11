(function($) {
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
            callbacks: {}, // 'id': {on_show: f(slideshow, page), on_lb: f(slideshow, page), on_rb: f(slideshow, page), on_hide: f(slideshow, page)}
            auto_play: false,
            auto_play_delay: 3000,
            auto_play_direction: 'forwards', // backwards or alternate, alternate reverses direction when it gets to the end
        };

        var default_callbacks = {
            on_show: function(slideshow, page) {return 5},
            on_lb: function(slideshow, page) {slideshow.prev_page()},
            on_rb: function(slideshow, page) {slideshow.next_page()},
            on_hide: function(slideshow, page) {}
        };
        // ================================================

        var settings = $.extend(defaults, options);

        // EVENTS =========================================
        var show_evt = $.Event('show_page');
        var hide_evt = $.Event('hide_page');
        var lb_evt = $.Event('left_button');
        var rb_evt = $.Event('right_button');
        // ================================================

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

            pages = {};

            $pages.find('.button_area > #lb').click(function() {
                $(this).parent().parent().trigger(lb_evt);
            });

            $pages.find('.button_area > #rb').click(function() {
                $(this).parent().parent().trigger(rb_evt);
            });

            apply_auto_play();
            assign_callbacks();

            return slideshow;
        }

        var assign_callbacks = function() {
            $pages.each(function() {
                var page_callbacks = $.extend(default_callbacks, settings.callbacks[this.id])
                console.log(this.id);
                console.log(settings);
                console.log($.extend(default_callbacks, settings.callbacks[this.id]));

                $(this).on('show', function() {
                    page_callbacks.on_show(slideshow, this);
                });

                $(this).on('hide', function() {
                    page_callbacks.on_hide(slideshow, this);
                });

                $(this).on(lb_evt, function() {
                    page_callbacks.on_lb(slideshow, this);
                });

                $(this).on(rb_evt, function() {
                    page_callbacks.on_rb(slideshow, this);
                });

                console.log($(this));
            });
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
                $current_page.fadeOut(function() {
                    show_page();
                });
            } else {
                // At the start $current_page is null so there is nothing to fade out.
                show_page();
            }
        }

        var show_page = function() {
            $current_page = $pages.eq(page_index);
            $current_page.fadeIn(function() {
                auto_play();
            });
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
        // ================================================

        return init();
    }
})(jQuery);

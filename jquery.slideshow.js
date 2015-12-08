(function($) {
    $.fn.slideshow = function(options) {
        // Handle multiple matches
        if (this.length > 1) {
            this.each(function(){
                $(this).slideshow(options);
            });
        }

        var slideshow = this; page_index = 0;
        var $container, $pages, $current_page;
        var skip_timeout, pages, page_css;

        // DEFAULT SETTINGS ===============================
        var defaults = {
            transition_type: 'x-fade', // 'x-fade' for fading, 'carousel' for sliding.
            transition_duration: 400, //duration in ms, same as jquery animation durations
            auto_play: false,
            auto_play_delay: 3000,
            auto_play_direction: 'forwards', // backwards or alternate, alternate reverses direction when it gets to the end
            show_callbacks: {}, // selector or index paired with a function
            hide_callbacks: {}
        };
        // ================================================

        var settings = $.extend(defaults, options);
        
        // SET UP TRANSITIONS =============================
        var launch_transition;
        var blocking = false;
        
        switch(settings.transition_type) {
            case 'x-fade':
                launch_transition = function(direction, do_after) {
                    // The do_after function is called after the transition is finished, but before
                    // the auto_play is set off again.
                    blocking = true;
                    if ($current_page) {
                        // Fade out old page and call its on_hide callback
                        // before setting and showing new page.
                        transition_out(do_after);
                    } else {
                        // At the start $current_page is null so there is nothing to fade out.
                        transition_in(do_after);
                    }
                };
                
                var transition_out = function(do_after) {
                    $current_page.fadeOut(settings.transition_duration, function() {
                      transition_in(do_after);
                    });
                }
                
                var transition_in = function(do_after) {
                    $current_page = $pages.eq(page_index);
                    $current_page.fadeIn(settings.transition_duration, function () {
                        blocking = false;
                        do_after();
                        auto_play();
                    });
                }
                break;
            
            case 'carousel':
                launch_transition = function(direction, do_after) {
                    if ($current_page) {
                        blocking = true;
                        var order = '2';
                        var margin_left = '0%';
                        if (direction == 'from-left') {
                            order = '0';
                            margin_left = '-100%';
                        }
                        
                        var $new_page = $pages.eq(page_index);
                        
                        $new_page.css({
                            'display': 'block',
                            'order': order,
                            'margin-left': margin_left
                        });
                        
                        slide(direction, $new_page, do_after);
                    } else {
                        $current_page = $pages.eq(page_index);
                        $current_page.css({'display': 'block', 'order': '1'});
                        do_after();
                        auto_play();
                    }
                }
                
                var slide = function(direction, $new_page, do_after) {
                    var page = $current_page;
                    var margin_left = '-100%';
                    
                    if (direction == 'from-left') {
                        page = $new_page;
                        margin_left = '0%';
                    } 
                    
                    page.animate({'margin-left': margin_left}, {
                        queue: false,
                        duration: settings.transition_duration,
                        complete: function() {
                            $current_page.css({'display': 'none', 'margin-left': '0'});
                            $current_page = $pages.eq(page_index);
                            $current_page.css({'order': '1'})
                            blocking = false;
                            do_after();
                            auto_play();
                        }
                    });
                }
                break;
        }

        // PRIVATE FUNCTIONS ==============================
        var init = function() {
            $container = $(slideshow);
            $pages = $container.find('.page');
            
            switch(settings.transition_type) {
                case 'x-fade':
                    $container.css({
                        'position': 'relative'
                    });
                    
                    page_css = {
                        'display': 'none',
                        'width': '100%',
                        'top': '0px',
                        'left': '0px',
                    }
                    break;
                case 'carousel':
                    $container.css({
                        'position': 'relative',
                        'overflow': 'hidden',
                        'display': 'flex',
                        'transition': 'height 0.6s ease'
                    });
                    
                    page_css = {
                        'display': 'none',
                        'width': '100%',
                        'height': 'auto',
                        'flex-basis': 'auto',
                        'flex-grow': '0',
                        'flex-shrink': '0'
                    };
                    break;
            }
            
            $pages.css(page_css);

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

        var set_page_by_id = function(page_id, direction) {
            set_page_by_index($pages.filter(page_id).index(), direction)
        }
        
        var call_callbacks = function(callbacks) {
            for (var key in callbacks) {
                if (typeof key == 'string' && $current_page.is(key)) {
                    // match page by selector
                    callbacks[key](page_index, $current_page.attr('id'));
                }
            }
        }

        var set_page_by_index = function(index, direction) {
            // return if there is a transition in progress already
            if (blocking) return;
            
            var new_page_index = Math.abs(index % $pages.length);
            
            // prevent animating to current page
            if (page_index == new_page_index && $current_page != null) return;
            
            // Intelligently decide the direction based on the change in the index
            if (direction == 'intelligent') {
                // Decides based on whether it's shorter to go towards the right and
                // loop around to the target or whether to go backwards
                if (new_page_index < page_index) {
                    right_distance = $pages.length - page_index + new_page_index;
                    left_distance = page_index - new_page_index;
                } else {
                    right_distance = new_page_index - page_index;
                    left_distance = $pages.length - new_page_index + page_index;
                }
                
                if (right_distance < left_distance) {
                    direction = 'from-right';
                } else {
                    direction = 'from-left'
                }
            }
            
            // call the hide callback for the page
            slideshow.clear_skip_timeout();
            if ($current_page != null) call_callbacks(settings.hide_callbacks)
            
            // We're all clear
            page_index = new_page_index;
            // hand over to the transition callback sequence...
            launch_transition(direction, function() {
              // This will set off the show_callbacks for the new page after the transition is done
              // but before auto_play kicks in again.
              call_callbacks(settings.show_callbacks)
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
            set_page_by_index(page_index + 1, 'from-right');
        }

        this.prev_page = function() {
            set_page_by_index(page_index - 1, 'from-left');
        }

        this.set_page = function(target_page, direction) {
            // Calls the appropriate set_page function based on whether
            // the page is identified with '#id' or its index
            if (direction == undefined) direction = 'from-left';
            if (typeof target_page == 'string') {
                set_page_by_id(target_page, direction);
            } else if (typeof target_page == 'number') {
                set_page_by_index(target_page, direction);
            }
        }
        
        this.get_page_index = function() {
            return page_index;
        }

        this.set_skip_timeout = function(delay, play_reverse) {
            // Sets the skip_timeout in the given direction
            // Clears the timeout if there is already one in place.
            if (skip_timeout) slideshow.clear_skip_timeout;
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
            $new_page.css(page_css);
            
            $container.append($new_page);
            $pages = $container.find('.page');
        }
        
        // ================================================

        return init();
    }
})(jQuery);

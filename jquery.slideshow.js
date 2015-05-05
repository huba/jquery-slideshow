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
            transition_type: 'x-fade', // 'x-fade' for fading, 'carousel' for sliding.
            auto_play: false,
            auto_play_delay: 3000,
            auto_play_direction: 'forwards', // backwards or alternate, alternate reverses direction when it gets to the end
        };
        // ================================================

        var settings = $.extend(defaults, options);
        
        // SET UP TRANSITIONS =============================
        var launch_transition;
        var blocking = false;
        
        switch(settings.transition_type) {
            case 'x-fade':
                launch_transition = function(direction) {
                    blocking = true;
                    if ($current_page) {
                        // Fade out old page and call its on_hide callback
                        // before setting and showing new page.
                        transition_out();
                    } else {
                        // At the start $current_page is null so there is nothing to fade out.
                        transition_in();
                    }
                };
                
                var transition_out = function() {
                    $current_page.fadeOut(transition_in);
                }
                
                var transition_in = function() {
                    $current_page = $pages.eq(page_index);
                    $current_page.fadeIn(function () {
                        blocking = false;
                        auto_play();
                    });
                }
                break;
            
            case 'carousel':
                launch_transition = function(direction) {
                    if ($current_page) {
                        blocking = true;
                        var left_offset = $container.width();
                        if (direction == 'from-left') left_offset *= -1;
                        
                        var $new_page = $pages.eq(page_index);
                        
                        $new_page.css({
                            'display': 'block',
                            'left': left_offset
                        });
                        
                        slide(left_offset, $new_page);
                    } else {
                        $current_page = $pages.eq(page_index);
                        $current_page.css({'display': 'block'});
                        auto_play();
                    }
                }
                
                var slide = function(left_offset, $new_page) {
                    $new_page.animate({'left': '0px'}, {queue: false});
                    
                    $current_page.animate({'left': -left_offset}, {
                        queue: false,
                        complete: function() {
                            $current_page.css({'display': 'none', 'left': '0px'});
                            $current_page = $pages.eq(page_index);
                            blocking = false;
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
                    
                    $pages.css({
                        'display': 'none',
                        'width': '100%',
                        'top': '0px',
                        'left': '0px',
                    });
                    break;
                case 'carousel':
                    if ($container.css('height').length <= 0) {
                        throw new Error('You must specify the height of your .container to be able to use the carousel setting!')
                    }
                    
                    $container.css({
                        'position': 'relative',
                        'overflow': 'hidden'
                    });
                    
                    $pages.css({
                        'display': 'none',
                        'width': '100%',
                        'height': '100%',
                        'position': 'absolute',
                        'top': '0px',
                        'left': '0px',
                    })
                    break;
            }

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

        var set_page_by_index = function(index, direction) {
            // return if there is a transition in progress already
            if (blocking) return;
            
            slideshow.clear_skip_timeout();
            page_index = index % $pages.length;
            // hand over to the transition callback sequence...
            launch_transition(direction);
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
            if (direction == undefined) direction = 'from-right';
            if (typeof target_page == 'string') {
                set_page_by_id(target_page, direction);
            } else if (typeof target_page == 'number') {
                set_page_by_index(target_page, direction);
            }
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

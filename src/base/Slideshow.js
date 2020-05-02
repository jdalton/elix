import CrossfadeStage from "./CrossfadeStage.js";
import * as internal from "./internal.js";
import TimerCursorMixin from "./TimerCursorMixin.js";

const Base = TimerCursorMixin(CrossfadeStage);

/**
 * Slideshow with a simple crossfade transition
 *
 * [A basic slideshow](/demos/slideshow.html)
 *
 * By default the slideshow will immediately begin playing when it is connected
 * to the document, and then advance every 3 seconds.
 *
 * This component provides no interactivity of its own. For an interactive
 * version, see [SlideshowWithPlayControls](SlideshowWithPlayControls) or
 * [CarouselSlideshow](CarouselSlideshow). To incorporate slideshow behavior
 * into a component of your own, apply
 * [TimerCursorMixin](TimerCursorMixin).
 *
 * @inherits CrossfadeStage
 * @mixes TimerCursorMixin
 */
class Slideshow extends Base {
  get [internal.defaultState]() {
    return Object.assign(super[internal.defaultState], {
      cursorOperationsWrap: true,
      playing: true,
      selectionTimerDuration: 3000,
      transitionDuration: 1000,
    });
  }
}

export default Slideshow;

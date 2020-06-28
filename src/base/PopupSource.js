import { fragmentFrom } from "../core/htmlLiterals.js";
import ReactiveElement from "../core/ReactiveElement.js";
import { transmute } from "../core/template.js";
import DisabledMixin from "./DisabledMixin.js";
import FocusVisibleMixin from "./FocusVisibleMixin.js";
import {
  defaultState,
  firstRender,
  ids,
  inputDelegate,
  raiseChangeEvents,
  render,
  rendered,
  setState,
  shadowRoot,
  state,
  stateEffects,
  template,
} from "./internal.js";
import LanguageDirectionMixin from "./LanguageDirectionMixin.js";
import OpenCloseMixin from "./OpenCloseMixin.js";
import Popup from "./Popup.js";

const resizeListenerKey = Symbol("resizeListener");

const Base = DisabledMixin(
  FocusVisibleMixin(LanguageDirectionMixin(OpenCloseMixin(ReactiveElement)))
);

/**
 * Positions a popup with respect to a source element
 *
 * @inherits ReactiveElement
 * @mixes DisabledMixin
 * @mixes FocusVisibleMixin
 * @mixes KeyboardMixin
 * @mixes OpenCloseMixin
 * @part {Popup} popup - the popup element
 * @part {button} source - the element used as the reference point for positioning the popup, generally the element that invokes the popup
 */
class PopupSource extends Base {
  get [defaultState]() {
    return Object.assign(super[defaultState], {
      ariaHasPopup: "true",
      horizontalAlign: "start",
      popupHeight: null,
      popupMeasured: false,
      popupPosition: "below",
      popupPartType: Popup,
      popupWidth: null,
      roomAbove: null,
      roomBelow: null,
      roomLeft: null,
      roomRight: null,
      sourcePartType: "div",
    });
  }

  // By default, assume that the source part is an input-like element that will
  // get the foucs.
  get [inputDelegate]() {
    return this[ids].source;
  }

  get frame() {
    return /** @type {any} */ (this[ids].popup).frame;
  }

  /**
   * The alignment of the popup with respect to the source button.
   *
   * * `start`: popup and source are aligned on the leading edge according to
   *   the text direction
   * * `end`: popup and source are aligned on the trailing edge according to the
   *   text direction
   * * `left`: popup and source are left-aligned
   * * `right`: popup and source are right-aligned
   * * `stretch: both left and right edges are aligned
   *
   * @type {('start'|'end'|'left'|'right'|'stretch')}
   * @default 'start'
   */
  get horizontalAlign() {
    return this[state].horizontalAlign;
  }
  set horizontalAlign(horizontalAlign) {
    this[setState]({ horizontalAlign });
  }

  [render](/** @type {ChangedFlags} */ changed) {
    super[render](changed);

    renderParts(this[shadowRoot], this[state], changed);

    if (this[firstRender] || changed.ariaHasPopup) {
      this[inputDelegate].setAttribute(
        "aria-haspopup",
        this[state].ariaHasPopup
      );
    }

    if (changed.popupPartType) {
      // Popup's opened state becomes our own opened state.
      this[ids].popup.addEventListener("open", () => {
        if (!this.opened) {
          this[raiseChangeEvents] = true;
          this.open();
          this[raiseChangeEvents] = false;
        }
      });

      // Popup's closed state becomes our own closed state.
      this[ids].popup.addEventListener("close", (event) => {
        if (!this.closed) {
          this[raiseChangeEvents] = true;
          /** @type {any} */

          const cast = event;
          const closeResult = cast.detail.closeResult;
          this.close(closeResult);
          this[raiseChangeEvents] = false;
        }
      });
    }

    if (
      changed.horizontalAlign ||
      changed.popupMeasured ||
      changed.rightToLeft
    ) {
      const {
        horizontalAlign,
        popupHeight,
        popupMeasured,
        popupPosition,
        popupWidth,
        rightToLeft,
        roomAbove,
        roomBelow,
        roomLeft,
        roomRight,
      } = this[state];

      const fitsAbove = popupHeight <= roomAbove;
      const fitsBelow = popupHeight <= roomBelow;
      const canLeftAlign = popupWidth <= roomRight;
      const canRightAlign = popupWidth <= roomLeft;

      const preferPositionBelow = popupPosition === "below";

      // We respect each position popup preference (above/below/right/right) if
      // there's room in that direction. Otherwise, we use the horizontal/vertical
      // position that maximizes the popup width/height.
      const positionBelow =
        (preferPositionBelow && (fitsBelow || roomBelow >= roomAbove)) ||
        (!preferPositionBelow && !fitsAbove && roomBelow >= roomAbove);
      const fitsVertically =
        (positionBelow && fitsBelow) || (!positionBelow && fitsAbove);
      const maxFrameHeight = fitsVertically
        ? null
        : positionBelow
        ? roomBelow
        : roomAbove;

      // Position popup.
      const bottom = positionBelow ? null : 0;

      let left;
      let right;
      let maxFrameWidth;
      if (horizontalAlign === "stretch") {
        left = 0;
        right = 0;
        maxFrameWidth = null;
      } else {
        const preferLeftAlign =
          horizontalAlign === "left" ||
          (rightToLeft
            ? horizontalAlign === "end"
            : horizontalAlign === "start");
        // The above/below preference rules also apply to left/right alignment.
        const alignLeft =
          (preferLeftAlign && (canLeftAlign || roomRight >= roomLeft)) ||
          (!preferLeftAlign && !canRightAlign && roomRight >= roomLeft);
        left = alignLeft ? 0 : null;
        right = !alignLeft ? 0 : null;

        const fitsHorizontally =
          (alignLeft && roomRight) || (!alignLeft && roomLeft);
        maxFrameWidth = fitsHorizontally
          ? null
          : alignLeft
          ? roomRight
          : roomLeft;
      }

      // Until we've measured the rendered position of the popup, render it in
      // fixed position (so it doesn't affect page layout or scrolling), and don't
      // make it visible yet. If we use `visibility: hidden` for this purpose, the
      // popup won't be able to receive the focus. Instead, we use zero opacity as
      // a way to make the popup temporarily invisible until we have checked where
      // it fits.
      const opacity = popupMeasured ? null : 0;
      const position = popupMeasured ? "absolute" : "fixed";

      const popup = this[ids].popup;
      Object.assign(popup.style, {
        bottom,
        left,
        opacity,
        position,
        right,
      });
      const frame = /** @type {any} */ (popup).frame;
      Object.assign(frame.style, {
        maxHeight: maxFrameHeight ? `${maxFrameHeight}px` : null,
        maxWidth: maxFrameWidth ? `${maxFrameWidth}px` : null,
      });
      this[ids].popupContainer.style.top = positionBelow ? "" : "0";
    }

    if (changed.opened) {
      const { opened } = this[state];
      /** @type {any} */ (this[ids].popup).opened = opened;
      this[ids].source.setAttribute("aria-expanded", opened.toString());
    }

    if (changed.disabled) {
      if ("disabled" in this[ids].source) {
        const { disabled } = this[state];
        /** @type {any} */ (this[ids].source).disabled = disabled;
      }
    }
  }

  [rendered](/** @type {ChangedFlags} */ changed) {
    super[rendered](changed);
    if (changed.opened) {
      if (this.opened) {
        // Worth noting that's possible (but unusual) for a popup to render opened
        // on first render.
        waitThenRenderOpened(this);
      } else {
        removeEventListeners(this);
      }
    } else if (this.opened && !this[state].popupMeasured) {
      // Need to recalculate popup measurements.
      measurePopup(this);
    }
  }

  /**
   * The preferred direction for the popup.
   *
   * * `above`: popup should appear above the source
   * * `below`: popup should appear below the source
   *
   * @type {('above'|'below')}
   * @default 'below'
   */
  get popupPosition() {
    return this[state].popupPosition;
  }
  set popupPosition(popupPosition) {
    this[setState]({ popupPosition });
  }

  /**
   * The class or tag used to create the `popup` part – the element
   * responsible for displaying the popup and handling overlay behavior.
   *
   * @type {PartDescriptor}
   * @default Popup
   */
  get popupPartType() {
    return this[state].popupPartType;
  }
  set popupPartType(popupPartType) {
    this[setState]({ popupPartType });
  }

  /**
   * The class or tag used to create the `source` part - the button
   * (or other element) the user can tap/click to invoke the popup.
   *
   * @type {PartDescriptor}
   * @default 'button'
   */
  get sourcePartType() {
    return this[state].sourcePartType;
  }
  set sourcePartType(sourcePartType) {
    this[setState]({ sourcePartType });
  }

  [stateEffects](state, changed) {
    const effects = super[stateEffects](state, changed);

    // Closing popup resets our calculations of popup size and room.
    if (changed.opened && !state.opened) {
      Object.assign(effects, {
        popupHeight: null,
        popupMeasured: false,
        popupWidth: null,
        roomAbove: null,
        roomBelow: null,
        roomLeft: null,
        roomRight: null,
      });
    }

    return effects;
  }

  get [template]() {
    const result = super[template];
    result.content.append(fragmentFrom.html`
      <style>
        :host {
          display: inline-block;
          position: relative;
        }

        [part~="source"] {
          height: 100%;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          width: 100%;
        }

        #popupContainer {
          height: 0;
          outline: none;
          position: absolute;
          width: 100%;
        }

        [part~="popup"] {
          align-items: initial;
          height: initial;
          justify-content: initial;
          left: initial;
          outline: none;
          position: absolute;
          top: initial;
          width: initial;
        }
      </style>
      <div id="source" part="source">
        <slot name="source"></slot>
      </div>
      <div id="popupContainer" role="none">
        <div id="popup" part="popup" exportparts="backdrop, frame" role="none">
          <slot></slot>
        </div>
      </div>
    `);

    renderParts(result.content, this[state]);

    return result;
  }
}

function addEventListeners(/** @type {PopupSource} */ element) {
  /** @type {any} */ const cast = element;
  cast[resizeListenerKey] = () => {
    measurePopup(element);
  };
  window.addEventListener("resize", cast[resizeListenerKey]);
}

/**
 * If we haven't already measured the popup since it was opened, measure its
 * dimensions and the relevant distances in which the popup might be opened.
 *
 * @private
 * @param {PopupSource} element
 */
function measurePopup(element) {
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;
  const popupRect = element[ids].popup.getBoundingClientRect();
  const sourceRect = element.getBoundingClientRect();
  element[setState]({
    popupHeight: popupRect.height,
    popupMeasured: true,
    popupWidth: popupRect.width,
    roomAbove: sourceRect.top,
    roomBelow: Math.ceil(windowHeight - sourceRect.bottom),
    roomLeft: sourceRect.right,
    roomRight: Math.ceil(windowWidth - sourceRect.left),
    windowHeight,
    windowWidth,
  });
}

function removeEventListeners(/** @type {PopupSource} */ element) {
  /** @type {any} */ const cast = element;
  if (cast[resizeListenerKey]) {
    window.removeEventListener("resize", cast[resizeListenerKey]);
    cast[resizeListenerKey] = null;
  }
}

/**
 * Render parts for the template or an instance.
 *
 * @private
 * @param {DocumentFragment} root
 * @param {PlainObject} state
 * @param {ChangedFlags} [changed]
 */
function renderParts(root, state, changed) {
  if (!changed || changed.popupPartType) {
    const { popupPartType } = state;
    const popup = root.getElementById("popup");
    if (popup) {
      transmute(popup, popupPartType);
    }
  }
  if (!changed || changed.sourcePartType) {
    const { sourcePartType } = state;
    const source = root.getElementById("source");
    if (source) {
      transmute(source, sourcePartType);
    }
  }
}

/**
 *
 * When a popup is first rendered, we let it render invisibly so that it doesn't
 * affect the page layout.
 *
 * We then wait, for two reasons:
 *
 * 1) We need to give the popup time to render invisibly. That lets us get the
 *    true size of the popup content.
 *
 * 2) Wire up events that can dismiss the popup. If the popup was opened because
 *    the user clicked something, that opening click event may still be bubbling
 *    up, and we only want to start listening after it's been processed.
 *    Along the same lines, if the popup caused the page to scroll, we don't
 *    want to immediately close because the page scrolled (only if the user
 *    scrolls).
 *
 * After waiting, we can take care of both of the above tasks.
 *
 * @private
 * @param {PopupSource} element
 */
function waitThenRenderOpened(element) {
  // Wait a tick to let the newly-opened component actually render.
  setTimeout(() => {
    // It's conceivable the popup was closed before the timeout completed,
    // so double-check that it's still opened before listening to events.
    if (element.opened) {
      measurePopup(element);
      addEventListeners(element);
    }
  });
}

export default PopupSource;

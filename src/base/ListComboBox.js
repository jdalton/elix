import { forwardFocus } from "../core/dom.js";
import { fragmentFrom } from "../core/htmlLiterals.js";
import { transmute } from "../core/template.js";
import ComboBox from "./ComboBox.js";
import { getDefaultText } from "./content.js";
import CursorAPIMixin from "./CursorAPIMixin.js";
import CursorSelectMixin from "./CursorSelectMixin.js";
import DelegateCursorMixin from "./DelegateCursorMixin.js";
import DelegateItemsMixin from "./DelegateItemsMixin.js";
import {
  defaultState,
  getItemText,
  goFirst,
  goLast,
  goNext,
  goPrevious,
  ids,
  itemsDelegate,
  keydown,
  render,
  rendered,
  setState,
  shadowRoot,
  state,
  stateEffects,
  template,
} from "./internal.js";
import ListBox from "./ListBox.js";
import SingleSelectAPIMixin from "./SingleSelectAPIMixin.js";

const Base = CursorAPIMixin(
  CursorSelectMixin(
    DelegateCursorMixin(DelegateItemsMixin(SingleSelectAPIMixin(ComboBox)))
  )
);

/**
 * A combo box whose popup presents a list of choices
 *
 * @inherits ComboBox
 * @mixes CursorAPIMixin
 * @mixes CursorSelectMixin
 * @mixes DelegateCursorMixin
 * @mixes DelegateItemsMixin
 * @mixes SingleSelectAPIMixin
 * @part {ListBox} list - the list of choices
 */
class ListComboBox extends Base {
  get [defaultState]() {
    return Object.assign(super[defaultState], {
      currentIndex: -1,
      horizontalAlign: "stretch",
      listPartType: ListBox,
    });
  }

  /**
   * Extract the text from the given item.
   *
   * The default implementation returns an item's `aria-label`, `alt` attribute,
   * or its `textContent`, in that order. You can override this to return the
   * text that should be used.
   *
   * @param {ListItemElement} item
   * @returns {string}
   */
  [getItemText](item) {
    return getDefaultText(item);
  }

  // We do our own handling of the Up and Down arrow keys, rather than relying
  // on KeyboardDirectionMixin. The latter supports Home and End, and we don't
  // want to handle those -- we want to let the text input handle them.
  // We also need to forward PageDown/PageUp to the list element.
  [keydown](/** @type {KeyboardEvent} */ event) {
    let handled;
    /** @type {any} */
    const list = this[ids].list;

    switch (event.key) {
      case "ArrowDown":
        if (this.opened) {
          handled = event.altKey ? this[goLast]() : this[goNext]();
        }
        break;

      case "ArrowUp":
        if (this.opened) {
          handled = event.altKey ? this[goFirst]() : this[goPrevious]();
        }
        break;

      case "PageDown":
        if (this.opened) {
          handled = list.pageDown && list.pageDown();
        }
        break;

      case "PageUp":
        if (this.opened) {
          handled = list.pageUp && list.pageUp();
        }
        break;
    }

    // Prefer mixin result if it's defined, otherwise use base result.
    return handled || (super[keydown] && super[keydown](event));
  }

  /**
   * The class or tag used to create the `list` part - the list of
   * available choices shown in the popup.
   *
   * @type {PartDescriptor}
   * @default ListBox
   */
  get listPartType() {
    return this[state].listPartType;
  }
  set listPartType(listPartType) {
    this[setState]({ listPartType });
  }

  get [itemsDelegate]() {
    return this[ids].list;
  }

  [render](/** @type {ChangedFlags} */ changed) {
    if (changed.listPartType && this[ids].list) {
      // Turn off focus handling for old list.
      /** @type {any} */
      const cast = this[ids].list;
      forwardFocus(cast, null);
    }

    super[render](changed);

    renderParts(this[shadowRoot], this[state], changed);

    if (changed.inputPartType) {
      this[ids].input.setAttribute("aria-autocomplete", "both");
    }

    if (changed.listPartType) {
      // this[ids].list.addEventListener("mousedown", (event) => {
      //   // Only process events for the main (usually left) button.
      //   if (/** @type {MouseEvent} */ (event).button !== 0) {
      //     return;
      //   }
      //   // Mousing down inside a list item closes the popup.
      //   /** @type {any} */
      //   const target = event.target;
      //   if (target) {
      //     const targetIndex = indexOfItemContainingTarget(this.items, target);
      //     if (this.opened && targetIndex >= 0) {
      //       this[raiseChangeEvents] = true;
      //       this.close();
      //       this[raiseChangeEvents] = false;
      //     }
      //   }
      // });

      // Keep focus off of the list and on the top level combo box (which should
      // delegate focus to the input).
      /** @type {any} */
      const cast = this[ids].list;
      forwardFocus(cast, this);

      // Track changes in the list's selection state.
      // Known bug: this behavior seems to confuse Gboard on Chrome for Android.
      // If we update our notion of the selection index, we'll ultimately update
      // the text shown in the input and leave it selected. If the user then
      // presses Backspace to delete that selected text, Gboard/Chrome seems to
      // ignore the first press of the Backspace key. The user must press
      // Backspace a second time to actually delete the selected text.
      // this[ids].list.addEventListener("selectedindexchange", (event) => {
      //   /** @type {any} */
      //   const cast = event;
      //   const listSelectedIndex = cast.detail.selectedIndex;
      //   if (this[state].selectedIndex !== listSelectedIndex) {
      //     this[raiseChangeEvents] = true;
      //     this[setState]({
      //       currentIndex: listSelectedIndex,
      //     });
      //     this[raiseChangeEvents] = false;
      //   }
      // });
    }

    // if (changed.currentIndex) {
    //   const list = /** @type {any} */ (this[ids].list);
    //   if ("selectedIndex" in list) {
    //     list.selectedIndex = this[state].currentIndex;
    //   }
    // }

    // The popup's current item is represented in the visible list.
    // if (changed.popupCurrentIndex) {
    //   const { popupCurrentIndex } = this[state];
    //   const list = /** @type {any} */ (this[ids].list);
    //   if ("currentIndex" in list) {
    //     list.currentIndex = popupCurrentIndex;
    //   }
    // }

    // TODO: Move this to PopupSelectMixin?
    // The popup's current item is represented in the visible list.
    if (changed.currentIndex) {
      const { currentIndex } = this[state];
      const list = /** @type {any} */ (this[ids].list);
      if ("currentIndex" in list) {
        list.currentIndex = currentIndex;
      }
    }
  }

  [rendered](changed) {
    super[rendered](changed);

    // Indicate which component is the popup's list.
    if (changed.listPartType) {
      this[setState]({
        popupList: this[ids].list,
      });
    }
  }

  [stateEffects](state, changed) {
    const effects = super[stateEffects](state, changed);

    // If value was changed directly or items have updated, select the
    // corresponding item in list.
    if (changed.items || changed.value) {
      const { value } = state;
      /** @type {ListItemElement[]} */ const items = state.items;
      if (items && value != null) {
        const searchText = value.toLowerCase();
        const currentIndex = items.findIndex((item) => {
          const itemText = this[getItemText](item);
          return itemText.toLowerCase() === searchText;
        });
        Object.assign(effects, { currentIndex });
      }
    }

    // If user selects a new item, or combo is closing, make selected item the
    // value.
    if (changed.opened || changed.currentIndex) {
      const { closeResult, items, opened, currentIndex, value } = state;
      const closing = changed.opened && !opened;
      const canceled = closeResult && closeResult.canceled;
      if (
        currentIndex >= 0 &&
        (changed.currentIndex || (closing && !canceled))
      ) {
        const currentItem = items[currentIndex];
        if (currentItem) {
          const currentItemText = this[getItemText](currentItem);
          // See notes on mobile at ComboBox.defaultState.
          const probablyMobile = matchMedia("(pointer: coarse)").matches;
          const selectText = !probablyMobile;
          if (value !== currentItemText) {
            Object.assign(effects, {
              selectText,
              value: currentItemText,
            });
          }
        }
      }
    }

    // When items change, we need to recalculate popup size.
    if (changed.items) {
      Object.assign(effects, {
        popupMeasured: false,
      });
    }

    return effects;
  }

  get [template]() {
    const result = super[template];

    // Wrap default slot with a list.
    const defaultSlot = result.content.querySelector("slot:not([name])");
    if (defaultSlot) {
      defaultSlot.replaceWith(fragmentFrom.html`
        <style>
          [part~="list"] {
            border: none;
            flex: 1;
            height: 100%;
            max-height: 100%;
            overscroll-behavior: contain;
            width: 100%;
          }
        </style>
        <div id="list" part="list" tabindex="-1">
          <slot></slot>
        </div>
      `);
    }

    renderParts(result.content, this[state]);

    return result;
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
  if (!changed || changed.listPartType) {
    const { listPartType } = state;
    const list = root.getElementById("list");
    if (list) {
      transmute(list, listPartType);
    }
  }
}

export default ListComboBox;

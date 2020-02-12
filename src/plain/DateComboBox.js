import * as internal from "../base/internal.js";
import * as template from "../core/template.js";
import PlainUpDownToggle from "./UpDownToggle.js";
import DateComboBox from "../base/DateComboBox.js";
import PlainButton from "./Button.js";
import PlainCalendarMonthNavigator from "./CalendarMonthNavigator.js";
import PlainOverlayFrame from "./OverlayFrame.js";

/**
 * @part {ArrowDirectionButton} arrow-button - both of the arrow buttons
 */
class PlainDateComboBox extends DateComboBox {
  get [internal.defaultState]() {
    return Object.assign(super[internal.defaultState], {
      calendarPartType: PlainCalendarMonthNavigator,
      framePartType: PlainOverlayFrame,
      todayButtonPartType: PlainButton,
      popupTogglePartType: PlainUpDownToggle
    });
  }

  get [internal.template]() {
    const result = super[internal.template];
    result.content.append(
      template.html`
        <style>
          :host {
            width: 8em;
          }

          #calendar {
            margin: 0.5em;
          }

          #todayButton {
            border: 1px solid transparent;
            padding: 0.5em;
          }

          #todayButton:hover {
            border-color: gray;
          }
        </style>
      `.content
    );
    return result;
  }
}

export default PlainDateComboBox;

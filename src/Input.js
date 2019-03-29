import { merge } from './updates.js';
import * as symbols from './symbols.js';
import * as template from './template.js';
import WrappedStandardElement from './WrappedStandardElement.js';


const Base = WrappedStandardElement.wrap('input');


/**
 * Base class for custom input elements
 * 
 * @inherits WrappedStandardElement
 */
class Input extends Base {

  componentDidMount() {
    if (super.componentDidMount) { super.componentDidMount(); }
    this.$.inner.addEventListener('input', () => {
      this[symbols.raiseChangeEvents] = true;
      /** @type {any} */
      const cast = this.inner;
      // Invoke the value setter to fix up selectionStart/selectionEnd too.
      this.value = cast.value;
      this[symbols.raiseChangeEvents] = false;
    });
  }

  componentDidUpdate(previousState) {
    if (super.componentDidUpdate) { super.componentDidUpdate(previousState); }
    const value = this.state.innerProperties.value;
    const changed = value !== previousState.innerProperties.value;
    if (changed && this[symbols.raiseChangeEvents]) {
        /**
         * Raised when the user changes the input value.
         * 
         * @event Input#value-changed
         */
        const event = new CustomEvent('value-changed', {
        detail: { value }
      });
      this.dispatchEvent(event);
    }
  }

  get [symbols.template]() {
    return template.html`
      <style>
        :host {
          display: inline-block;
        }
        
        #inner {
          box-sizing: border-box;
          font-family: inherit;
          font-size: inherit;
          font-style: inherit;
          font-weight: inherit;
          height: 100%;
          width: 100%;
        }
      </style>

      <input id="inner">
        <slot></slot>
      </input>
    `;
  }

  get updates() {
    // The base class wants to update the inner input element's value to match
    // the current state. However, in Safari, even if the value hasn't actually
    // changed, updating the value will still collapse the selection. Chrome's
    // input handles this as we'd like: setting the value will leave the
    // selection unaffected if the value is the same as before. We want to
    // emulate Chrome's behavior. So if the value doesn't actually need to be
    // updated, we remove it from the updates. We normally don't do this kind of
    // check, but here we need to do it to preserve selection in Safari.
    const base = super.updates;
    const value = this.state.innerProperties.value;
    /** @type {any} */
    const cast = this.$.inner;
    if (cast.value === value && base.$.inner.value === value) {
      delete base.$.inner.value;
    }
    return merge(base, {
      attributes: {
        'aria-hidden': 'true'
      }
    });
  }

  // Updating the value can also update the selectionStart and selectionEnd
  // properties, so we have to update our state to match.
  get value() {
    // @ts-ignore
    return super.value;
  }
  set value(value) {
    // @ts-ignore
    super.value = value;
    if (this.shadowRoot) {
      /** @type {any} */
      const cast = this.inner;
      this.setInnerProperty('selectionStart', cast.selectionStart);
      this.setInnerProperty('selectionEnd', cast.selectionEnd);
    }
  }

}


export default Input;
customElements.define('elix-input', Input);

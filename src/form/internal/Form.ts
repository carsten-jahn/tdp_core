import {debounce, randomId} from 'phovea_core/src';
import {EventHandler, IEvent} from 'phovea_core/src/event';
import {IFormElement, IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';
import {IFormRule} from './rules';

export default class Form<T extends object> extends EventHandler {
  /**
   * arguments: oldValue, newValue
   */
  static readonly EVENT_CHANGED = AFormElement2.EVENT_CHANGE;
  /**
   * arguments: property, oldValue, newValue
   */
  static readonly EVENT_PROPERTY_CHANGED = AFormElement2.EVENT_CHANGE;

  private current: T;
  private previous: T;

  private readonly fireChange = debounce(() => {
    this.rules.forEach((rule) => rule(this.current, this.elems));
    this.fire(Form.EVENT_CHANGED, this.previous, this.previous = this.current);
  }, 20);

  readonly node: HTMLFormElement;

  readonly elems = new Map<keyof T, IFormElement<any>>();

  constructor(elems: AFormElement2<any, IFormElementDesc>[], private readonly rules: IFormRule<T>[]) {
    super();
    elems.forEach((e) => this.elems.set(<any>e.property, e));

    const onPropertyChange = (event: IEvent, oldValue: any, newValue: any) => {
      const elem = <AFormElement2<any, any>>event.target;
      this.current[elem.property] = newValue;
      this.fire(Form.EVENT_PROPERTY_CHANGED, elem.property, oldValue, newValue);
      this.fireChange();
    };

    // initial value
    this.current = <any>{};

    const formId = randomId();
    this.node = elems[0].node.ownerDocument.createElement('form');
    this.node.id = formId;

    elems.forEach((elem) => {
      elem.on(AFormElement2.EVENT_CHANGE, onPropertyChange);
      elem.init(formId);
      this.node.appendChild(elem.node);
      this.current[elem.property] = elem.value;
    });

    this.previous = this.current;
    // run first rules
    this.rules.forEach((r) => r(this.current, this.elems));
  }

  get values() {
    return Array.from(this.elems.values());
  }

  /**
   * validates the current form
   * @returns {boolean} if valid
   */
  validate() {
    // don't abort after first invalid element thus cannot use every directly
    return this.values.map((d) => d.validate())
      .every((d) => d); // return true if every validation was truthy
  }

  equal(a: T, b: T) {
    if (a === b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    // compare based on registered elements
    return this.values.every((elem) => (<AFormElement2<any, any>>elem).equal(a[elem.property], b[elem.property]));
  }

  set value(value: T) {
    if (this.equal(this.current, value)) {
      return;
    }
    this.current = value;
    this.elems.forEach((elem) => {
      if (value.hasOwnProperty(elem.property)) {
        elem.value = value[elem.property];
      }
    });
    this.fireChange();
  }

  get value() {
    return this.current;
  }
}

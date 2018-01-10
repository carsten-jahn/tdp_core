import {fixId} from 'phovea_core/src';
import {EventHandler} from 'phovea_core/src/event';
import {retrieve, store} from 'phovea_core/src/session';
import {IFormElement, IFormElementDesc} from '../interfaces';

export interface IFormElementExtras {
  id: string;
  document?: Document;
}

export abstract class AFormElement2<T, D extends IFormElementDesc> extends EventHandler implements IFormElement<T> {
  static readonly EVENT_CHANGE = 'change';


  readonly node: HTMLElement;
  readonly desc: D;

  protected currentValue: T | null = null;


  constructor(desc: Partial<D> & IFormElementExtras) {
    super();
    this.desc = Object.assign(this.defaultDesc(), desc);
    this.node = (desc.document || document).createElement('div');
  }

  /*final*/ init() {
    this.initImpl();
    this.restoreValue();
  }

  protected initImpl() {
    this.node.classList.add('form-group');
    if (this.desc.label !== false) {
      this.node.insertAdjacentHTML('afterbegin', `<label for="${this.elementId}">${this.desc.label}</label>`);
    }
    const input = this.input();
    if (!input) {
      return;
    }
    input.classList.add('form-control');
    input.required = this.desc.required;
    input.id = this.elementId;
  }

  protected defaultDesc(): D {
    return <any>{
      label: '',
      cached: true,
      required: false
    };
  }

  get id() {
    return this.desc.id;
  }

  protected input(): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null {
    return <HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>this.node.querySelector('input, select, textarea') || null;
  }

  protected get elementId() {
    return `f${fixId(this.id)}`;
  }

  private get sessionKey() {
    return `tdp.formBuilder.${this.id}${typeof this.desc.cached === 'string' ? this.desc.cached : ''}`;
  }

  protected restoreValue() {
    if (!this.desc.cached) {
      return;
    }
    const v = retrieve(this.sessionKey, undefined);
    if (v === undefined) {
      return;
    }
    this.value = v;
  }

  private updateStoredValue(value: T) {
    if (!this.desc.cached) {
      return;
    }
    store(this.sessionKey, value);
  }

  get visible() {
    return !this.node.classList.contains('hidden');
  }

  set visible(visible: boolean) {
    this.node.classList.toggle('hidden', !visible);
  }

  validate() {
    if (!this.visible || !this.desc.required || !this.input()) {
      return true;
    }
    const v = Boolean(this.currentValue);
    this.node.classList.toggle('error', !v);
    return v;
  }

  /**
   * updates to the new value return the SAME instance if no value has changed
   * @param {T} v
   * @returns {T}
   */
  protected abstract updateValue(v: T): T;

  get value() {
    return this.currentValue;
  }

  set value(v: T) {
    const bak = this.currentValue;
    const newValue = this.updateValue(v);
    if (bak === newValue) {
      return; // same
    }
    this.updateStoredValue(newValue);
    this.fire(AFormElement2.EVENT_CHANGE, bak, this.currentValue = newValue);
  }

  focus() {
    const input = this.input();
    if (input) {
      input.focus();
    }
  }
}

export default AFormElement2;

import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';

export interface IInputNumberElementDesc extends IFormElementDesc {
  placeholder: string;
  min: number;
  max: number;
  step: number | 'any';
}

export default class FormInputNumber extends AFormElement2<number, IInputNumberElementDesc> {

  protected initImpl() {
    this.node.insertAdjacentHTML('beforeend', `<input type="number" placeholder="${this.desc.placeholder}"
      ${isFinite(this.desc.min) ? ` min="${this.desc.min}"` : ''}
      ${isFinite(this.desc.max) ? ` max="${this.desc.max}"` : ''}
      ${typeof this.desc.step === 'string' || isFinite(this.desc.step) ? ` step="${this.desc.step}"` : ''}>`);
    super.initImpl();
    const input = this.input();
    input.addEventListener('change', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = parseFloat(input.value);
    });
  }

  protected defaultDesc(): IInputNumberElementDesc {
    const r = super.defaultDesc();
    r.placeholder = '';
    r.min = -Infinity;
    r.max = +Infinity;
    r.step = 'any';
    return r;
  }

  protected input(): HTMLInputElement {
    return <HTMLInputElement>super.input();
  }

  protected updateValue(v: number) {
    // no special handling needed
    this.input().value = String(v);
    return v;
  }
}

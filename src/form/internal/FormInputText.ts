/**
 * Created by Samuel Gratzl on 08.03.2017.
 */

import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';


export interface IInputTextDesc extends IFormElementDesc {
  placeholder: string;
  type: string;
}

export default class FormInputText extends AFormElement2<string, IInputTextDesc> {

  protected initImpl() {
    this.node.insertAdjacentHTML('beforeend', `<input type="${this.desc.type}" placeholder="${this.desc.placeholder}">`);
    super.initImpl();
    const input = this.input();
    input.addEventListener('change', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = input.value;
    });
  }

  protected defaultDesc(): IInputTextDesc {
    const r = super.defaultDesc();
    r.placeholder = '';
    r.type = 'text';
    return r;
  }

  protected input(): HTMLInputElement {
    return <HTMLInputElement>super.input();
  }

  protected updateValue(v: string|null) {
    // no special handling needed
    return this.input().value = v == null ? '' : v;
  }
}

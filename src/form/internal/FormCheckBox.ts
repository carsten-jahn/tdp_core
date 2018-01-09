import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';

export declare type ICheckBoxElementDesc = IFormElementDesc;

export default class FormCheckBox extends AFormElement2<boolean, ICheckBoxElementDesc> {

  protected initImpl() {
    super.initImpl();
    const l = this.node.querySelector('label');
    if (l) { // inject in label
      l.insertAdjacentHTML('afterbegin', `<input type="checkbox" id="${this.elementId}">`);
    } else {
      this.node.insertAdjacentHTML('beforeend', `<input type="checkbox" id="${this.elementId}">`);
    }
    const input = this.input();
    input.addEventListener('change', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = input.checked;
    });
  }

  protected input(): HTMLInputElement {
    return <HTMLInputElement>super.input();
  }

  protected updateValue(v: boolean) {
    // no special handling needed
    return this.input().checked = v;
  }
}

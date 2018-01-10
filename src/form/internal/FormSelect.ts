import {resolveImmediately} from 'phovea_core/src';
import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';

export interface ISelectOption {
  id: string;
  text: string;
}

export interface ISelectDesc extends IFormElementDesc {
  multiple: boolean;
  options: ((string | ISelectOption)[] | Promise<(string | ISelectOption)[]>);
}


export default class FormSelect extends AFormElement2<string, ISelectDesc> {

  protected initImpl() {
    this.node.insertAdjacentHTML('beforeend', `<select ${this.desc.multiple ? 'multiple' : ''}>`);
    super.initImpl();
    const input = this.input();
    input.addEventListener('change', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = input.value;
    });

    resolveImmediately(this.desc.options).then((options) => {
      options.forEach((opt) => {
        input.insertAdjacentHTML('beforend', `<option value="${typeof opt === 'string' ? opt : opt.id}">${typeof opt === 'string' ? opt : opt.text}</option>`);
      });
      // force an update of the DOM element
      this.updateValue(this.currentValue);
    });
  }

  setOptions(options: (string | ISelectOption)[]) {
    const input = this.input();
    input.innerHTML = ``;
    options.forEach((opt) => {
      input.insertAdjacentHTML('beforend', `<option value="${typeof opt === 'string' ? opt : opt.id}">${typeof opt === 'string' ? opt : opt.text}</option>`);
    });
    // force an update of the DOM element
    this.updateValue(this.currentValue);
  }

  protected defaultDesc(): ISelectDesc {
    const r = super.defaultDesc();
    r.multiple = false;
    r.options = [];
    return r;
  }

  protected input(): HTMLSelectElement {
    return <HTMLSelectElement>super.input();
  }

  protected updateValue(v: string) {
    const input = this.input();
    const options = <HTMLOptionElement[]>Array.from(input.options);
    input.selectedIndex = options.findIndex((d) => d.value === v);
    return v;
  }
}

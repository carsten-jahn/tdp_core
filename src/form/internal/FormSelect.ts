import {resolveImmediately} from 'phovea_core/src';
import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';
import {equalArrays} from './Select3';

export interface ISelectOption {
  id: string;
  text: string;
}

export interface ISelectDesc extends IFormElementDesc {
  multiple: boolean;
  options: ((string | ISelectOption)[] | Promise<(string | ISelectOption)[]>);
}


export default class FormSelect extends AFormElement2<string, ISelectDesc> {

  private options: ISelectOption[] = [];

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
      this.setOptions(options);
    });
  }

  setOptions(options: (string | ISelectOption)[]) {
    const value = normalize(options);
    if (equalArrays(this.options, value)) {
      return;
    }
    this.options = value;
    const input = this.input();
    const before = input.selectedIndex;
    input.innerHTML = ``;
    this.options.forEach((opt) => {
      input.insertAdjacentHTML('beforend', `<option value="${opt.id}">${opt.text}</option>`);
    });
    // force an update of the DOM element
    this.updateValue(this.currentValue);

    const after = input.selectedIndex;
    if (after !== before && after < 0) {
      // invalid new value
      this.value = null;
    }
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
    if (options.length === 0) {
      // not yet initialized
      return v;
    }
    input.selectedIndex = options.findIndex((d) => d.value === v);
    // reject value if not valid option
    return input.selectedIndex < 0 ? null : v;
  }
}

function normalize(arr: (string | ISelectOption)[]): ISelectOption[] {
  return arr.map((d) => typeof d === 'string' ? {id: d, text: d} : d);
}

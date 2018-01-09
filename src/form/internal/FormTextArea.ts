import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';

export interface ITextAreaElementDesc extends IFormElementDesc {
  placeholder: string;
}

export default class FormTextArea extends AFormElement2<string, ITextAreaElementDesc> {

  protected initImpl() {
    this.node.insertAdjacentHTML('beforeend', `<textarea placeholder="${this.desc.placeholder}"></textarea>`);
    super.initImpl();
    const input = this.input();
    input.addEventListener('change', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = input.value;
    });
  }

  protected defaultDesc(): ITextAreaElementDesc {
    const r = super.defaultDesc();
    r.placeholder = '';
    return r;
  }

  protected input(): HTMLTextAreaElement {
    return <HTMLTextAreaElement>super.input();
  }

  protected updateValue(v: string) {
    // no special handling needed
    return this.input().value = v;
  }
}

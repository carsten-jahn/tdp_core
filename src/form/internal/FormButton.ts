import {IFormElementDesc} from '../interfaces';
import AFormElement2 from './AFormElement2';


export interface IButtonElementDesc extends IFormElementDesc {
  iconClass: string;
}

export default class FormButton extends AFormElement2<boolean, IButtonElementDesc> {

  protected initImpl() {
    this.node.innerHTML = `<button>${this.desc.iconClass ? `<i class="${this.desc.iconClass}"></i> ${this.desc.label}` : this.desc.label.toString()}</button>`;
    this.node.firstElementChild!.addEventListener('click', (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      this.value = true;
    });
    super.initImpl();
    // remove label again
    const l = this.node.querySelector('label');
    if (l) {
      l.remove();
    }
  }

  protected defaultDesc(): IButtonElementDesc {
    const r = super.defaultDesc();
    r.iconClass = '';
    return r;
  }

  protected updateValue(v: boolean|null) {
    // no special handling needed
    return v || false;
  };
}

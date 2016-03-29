/**
 * Created by Samuel Gratzl on 29.01.2016.
 */

import {AView, EViewMode, IViewContext} from './View';

export class SimpleView extends AView {
  constructor(context: IViewContext, parent: Element, options?) {
    super(context, parent, options);
    this.$node.classed('simple', true);

    this.build();
  }

  private build() {
    this.context.idtype.unmap(this.context.selection).then((names) => {
      this.$node.html(`
      <p>
        <div>IDType: ${this.context.idtype}</div>
        <div>Selection: ${this.context.selection}</div>
        <div>Selection: ${names}</div>
      </p>`);
    });
  }

  modeChanged(mode: EViewMode) {
    super.modeChanged(mode);
    this.$node.select('div').text('Test ' + mode);
  }
}



export function create(context: IViewContext, parent: Element, options?) {
  return new SimpleView(context, parent, options);
}


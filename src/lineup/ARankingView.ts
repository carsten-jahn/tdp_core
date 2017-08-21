/**
 * Created by Samuel Gratzl on 29.01.2016.
 */
import {AView, EViewMode, IViewContext, ISelection} from '../views';
import LineUp, {ILineUpConfig} from 'lineupjs/src/lineup';
import Column, {IColumnDesc} from 'lineupjs/src/model/Column';
import {deriveColors} from 'lineupjs/src/';
import {ScaleMappingFunction, Ranking} from 'lineupjs/src/model';
import CompositeColumn from 'lineupjs/src/model/CompositeColumn';
import ValueColumn from 'lineupjs/src/model/ValueColumn';
import NumberColumn from 'lineupjs/src/model/NumberColumn';
import {IBoxPlotData} from 'lineupjs/src/model/BoxPlotColumn';
import {LocalDataProvider,} from 'lineupjs/src/provider';
import {resolve, IDTypeLike} from 'phovea_core/src/idtype';
import {clueify, withoutTracking, untrack} from './internal/cmds';
import {saveNamedSet} from '../storage';
import {showErrorModalDialog} from '../Dialogs';
import LineUpRankingButtons from './internal/LineUpRankingButtons';
import LineUpSelectionHelper from './internal/LineUpSelectionHelper';
import IScore, {IScoreRow, createAccessor} from './IScore';
import {stringCol, createInitialRanking, IAdditionalColumnDesc, categoricalCol, numberCol} from './desc';
import {pushScoreAsync} from './internal/scorecmds';
import {mixin} from 'phovea_core/src';
import {extent} from 'd3';
import LineUpColors from './internal/LineUpColors';
import {IRow} from './interfaces';
import {IContext, ISelectionAdapter, ISelectionColumn, none} from './selection';

export interface IARankingViewOptions {
  itemName: string;
  itemNamePlural: string;
  itemIDType: IDTypeLike | null;
  additionalScoreParameter: object | (() => object);
  additionalComputeScoreParameter: object | (() => object);
  subType: { key: string, value: string };
  selectionAdapter: ISelectionAdapter;
}

export interface IServerColumn {
  label: string;
  column: string;
  type: 'categorical' | 'number' | 'string';

  categories?: string[];

  min?: number;
  max?: number;
}

export abstract class ARankingView extends AView {

  private readonly config: ILineUpConfig = {
    renderingOptions: {
      histograms: true
    },
    header: {
      rankingButtons: ($node: d3.Selection<Ranking>) => {
        const rb = new LineUpRankingButtons(this.provider, $node, this.itemIDType, this.options.additionalScoreParameter);
        rb.on(LineUpRankingButtons.EVENT_SAVE_NAMED_SET, (_event, order: number[], name: string, description: string, isPublic: boolean) => {
          this.saveNamedSet(order, name, description, isPublic);
        });
        rb.on(LineUpRankingButtons.EVENT_ADD_SCORE_COLUMN, (_event, scoreImpl: IScore<any>) => {
          this.addScoreColumn(scoreImpl);
        });
        rb.on(LineUpRankingButtons.EVENT_ADD_TRACKED_SCORE_COLUMN, (_event, scoreId: string, params: any) => {
          this.pushTrackedScoreColumn(scoreId, params);
        });
      }
    }
  };
  /**
   * Stores the ranking data when collapsing columns on modeChange()
   * @type {any}
   */
  private dump: Map<string, number | boolean> = null;

  /**
   * DOM element with message when no data is available
   */
  private readonly noData: HTMLElement;
  /**
   * DOM element for LineUp stats in parameter UI
   */
  private readonly stats: HTMLElement;

  private readonly provider = new LocalDataProvider([], []);
  private readonly lineup: LineUp;
  private readonly selectionHelper: LineUpSelectionHelper;

  protected built: Promise<any> = null;

  private readonly colors = new LineUpColors();

  private readonly options: Readonly<IARankingViewOptions> = {
    itemName: 'item',
    itemNamePlural: 'items',
    itemIDType: null,
    additionalScoreParameter: null,
    additionalComputeScoreParameter: null,
    subType: {key: '', value: ''},
    selectionAdapter: none()
  };

  constructor(context: IViewContext, selection: ISelection, parent: HTMLElement, options: Partial<IARankingViewOptions> = {}) {
    super(context, selection, parent);
    mixin(this.options, options);

    this.node.classList.add('lineup');
    this.node.insertAdjacentHTML('beforeend', `<p class="nodata hidden">No data found for selection and parameter.</p>`);
    this.noData = <HTMLElement>this.node.lastElementChild!;

    this.stats = this.node.ownerDocument.createElement('p');

    // hack in for providing the data provider within the graph
    this.context.ref.value.data = this.provider;

    this.provider.on(LocalDataProvider.EVENT_ORDER_CHANGED, () => this.updateLineUpStats());
    this.lineup = new LineUp(this.node, this.provider, this.config);
    this.selectionHelper = new LineUpSelectionHelper(this.lineup, this.itemIDType);
    this.selectionHelper.on(LineUpSelectionHelper.EVENT_SET_ITEM_SELECTION, (_event, selection: ISelection) => {
      this.setItemSelection(selection);
      this.updateLineUpStats();
    });
  }

  init(params: HTMLElement, onParameterChange: (name: string, value: any) => Promise<any>) {
    // inject stats
    params.insertAdjacentHTML('beforeend', `<div class="form-group"></div>`);
    params.lastElementChild!.appendChild(this.stats);

    super.init(params, onParameterChange);
  }

  protected initImpl() {
    super.initImpl();
    this.built = this.build();
  }

  get itemIDType() {
    return this.options.itemIDType ? resolve(this.options.itemIDType) : null;
  }

  protected parameterChanged(name: string) {
    super.parameterChanged(name);
    if (this.options.selectionAdapter) {
      this.options.selectionAdapter.parameterChanged(this.createContext());
    }
  }

  protected itemSelectionChanged() {
    this.selectionHelper.setItemSelection(this.itemSelection);
    super.itemSelectionChanged();
  }

  protected selectionChanged() {
    if (this.options.selectionAdapter) {
      this.options.selectionAdapter.selectionChanged(this.createContext());
    }
  }

  private createContext(): IContext {
    return {
      columns: this.provider.getLastRanking().flatColumns,
      selection: this.selection,
      freeColor: (id: number) => this.colors.freeColumnColor(id),
      add: (columns: ISelectionColumn[]) => this.withoutTracking(() => {
        columns.forEach((col) => this.addColumn(col.desc, col.data, col.id));
      }),
      remove: (columns: Column[]) => this.withoutTracking(() => {
        columns.forEach((c) => c.removeMe());
      })
    };
  }

  /**
   * Expand/collapse certain columns on mode change.
   * Expand = focus view
   * Collapse = context view
   * @param mode
   */
  modeChanged(mode: EViewMode) {
    super.modeChanged(mode);
    if (this.provider.getRankings().length <= 0) {
      return;
    }
    const ranking = this.provider.getRankings()[0];

    if (mode === EViewMode.FOCUS) {
      if (this.dump) {
        ranking.children.forEach((c) => {
          if (!this.dump.has(c.id)) {
            return;
          }
          if (c instanceof CompositeColumn) {
            c.setCompressed(false);
          } else {
            c.setWidth(<number>this.dump.get(c.id));
          }
        });
      }
      this.dump = null;
      return;
    }

    if (this.dump !== null) {
      return;
    }

    const s = ranking.getSortCriteria();
    const labelColumn = ranking.children.filter((c) => c.desc.type === 'string')[0];

    this.dump = new Map<string, number | boolean>();
    ranking.children.forEach((c) => {
      if (c === labelColumn ||
        c === s.col ||
        c.desc.type === 'rank' ||
        c.desc.type === 'selection' ||
        (<any>c.desc).column === 'id' // = Ensembl column
      ) {
        // keep these columns
      } else if (c instanceof CompositeColumn && !c.getCompressed()) {
        c.setCompressed(true);
        this.dump.set(c.id, true);
      } else {
        this.dump.set(c.id, c.getWidth());
        c.hide();
      }
    });
  }


  private async saveNamedSet(order: number[], name: string, description: string, isPublic: boolean = false) {
    const ids = this.selectionHelper.rowIdsAsSet(order);
    const namedSet = await saveNamedSet(name, this.itemIDType, ids, this.options.subType, description, isPublic);
    this.fire(AView.EVENT_UPDATE_ENTRY_POINT, this.itemIDType, namedSet);
  }

  private addColumn(colDesc: any, data: Promise<IScoreRow<any>[]>, id = -1): { col: Column, loaded: Promise<Column> } {
    const ranking = this.provider.getLastRanking();

    //mark as lazy loaded
    (<any>colDesc).lazyLoaded = true;
    colDesc.color = this.colors.getColumnColor(id);
    const accessor = createAccessor(colDesc);

    this.provider.pushDesc(colDesc);
    const col = this.provider.push(ranking, colDesc);

    // error handling
    data
      .catch(showErrorModalDialog)
      .catch(() => {
        ranking.remove(col);
      });

    // success
    const loaded = data.then((rows: IScoreRow<any>[]) => {
      accessor.rows = rows;

      if (colDesc.type === 'number') {
        const ncol = <NumberColumn>col;
        if (!(colDesc.constantDomain)) { //create a dynamic range if not fixed
          const domain = extent(rows, (d) => <number>d.score);
          //HACK by pass the setMapping function and set it inplace
          const ori = <ScaleMappingFunction>(<any>ncol).original;
          const current = <ScaleMappingFunction>(<any>ncol).mapping;
          colDesc.domain = domain;
          ori.domain = domain;
          current.domain = domain;
        }
      } else if (colDesc.type === 'boxplot') {
        //HACK we know that the domain of the description is just referenced, so we can update it by changing values!
        if (!(colDesc.constantDomain)) { //create a dynamic range if not fixed
          colDesc.domain[0] = Math.min(...rows.map((d) => (<IBoxPlotData>d.score).min));
          colDesc.domain[1] = Math.max(...rows.map((d) => (<IBoxPlotData>d.score).max));
        }
      }

      if (this.lineup) {
        // find all columns with the same descriptions (generated snapshots) to set their `setLoaded` value
        this.provider.getRankings().forEach((ranking) => {
          const columns = ranking.flatColumns.filter((rankCol) => rankCol.desc === col.desc);
          columns.forEach((column) => (<ValueColumn<any>>column).setLoaded(true));
        });

        this.lineup.update();
      }
      return col;
    });

    return {col, loaded};
  }

  private addScoreColumn(score: IScore<any>) {
    const colDesc = score.createDesc();
    // flag that it is a score
    colDesc._score = true;

    const ids = this.selectionHelper.rowIdsAsSet(this.provider.getRankings()[0].getOrder());
    const args = typeof this.options.additionalComputeScoreParameter === 'function' ? this.options.additionalComputeScoreParameter() : this.options.additionalComputeScoreParameter;
    const data = score.compute(ids, this.itemIDType, args);
    return this.addColumn(colDesc, data);
  }

  private async withoutTracking<T>(f: (lineup: any) => T): Promise<T> {
    return withoutTracking(this.context.ref, () => f(this.lineup));
  }

  private addTrackedScoreColumn(score: IScore<any>) {
    return this.withoutTracking(() => this.addScoreColumn(score));
  }

  pushTrackedScoreColumn(scoreId: string, params: any) {
    return pushScoreAsync(this.context.graph, this.context.ref, scoreId, params);
  }

  removeTrackedScoreColumn(columnId: string) {
    return this.withoutTracking((lineup) => {
      const column = lineup.data.find(columnId);
      return column.removeMe();
    });
  }

  protected abstract loadColumnDesc(): Promise<{ columns: IServerColumn[] }>;

  protected abstract loadRows(): Promise<IRow[]>;

  protected getColumnDescs(columns: IServerColumn[]) {
    const niceName = (label: string) => label.split('_').map((l) => l[0].toUpperCase() + l.slice(1)).join(' ');

    return columns.map((col) => {
      switch (col.type) {
        case 'categorical':
          return categoricalCol(col.column, col.categories, niceName(col.label), false);
        case 'number':
          return numberCol(col.column, col.min, col.max, niceName(col.label), false);
        case 'string':
          return stringCol(col.column, niceName(col.label), false);
      }
    });
  }

  private getColumns(): Promise<IAdditionalColumnDesc[]> {
    return this.loadColumnDesc().then(({columns}) => {
      const cols = this.getColumnDescs(columns);
      deriveColors(cols);
      return cols;
    });
  }

  private build() {
    this.setBusy(true);
    return Promise.all([this.getColumns(), this.loadRows()]).then((r) => {
      const columns: IColumnDesc[] = r[0];
      const rows: IRow[] = r[1];

      if (rows.length > 0) {
        this.noData.classList.add('hidden');
      } else {
        this.noData.classList.remove('hidden');
      }
      columns.forEach((c) => this.provider.pushDesc(c));
      this.provider.setData(rows);
      this.selectionHelper.rows = rows;
      this.selectionHelper.setItemSelection(this.getItemSelection());
      createInitialRanking(this.lineup);

      //record after the initial one
      clueify(this.context.ref, this.context.graph);
    }).catch(() => {
      this.setBusy(false);
    });
  }

  /**
   * clears and rebuilds this lineup instance from scratch
   * @returns {Promise<any[]>}
   */
  protected rebuild() {
    this.clear();
    return this.built = this.build();
  }

  /**
   * Writes the number of total, selected and shown items in the parameter area
   */
  private updateLineUpStats() {
    const showStats = (total: number, selected = 0, shown = 0) => {
      return `Showing ${shown} ${total > 0 ? `of ${total}` : ''}${selected > 0 ? `; ${selected} ${selected === 1 ? this.options.itemName : this.options.itemNamePlural}` : ''}`;
    };

    const selected = this.provider.getSelection().length;
    const total = this.provider.data.length;

    const r = this.provider.getRankings()[0];
    const shown = r && r.getOrder() ? r.getOrder().length : 0;
    this.stats.textContent = showStats(total, selected, shown);
  }

  /**
   * Destroy LineUp instance
   */
  protected clear() {
    //reset
    untrack(this.context.ref);
    this.provider.clearRankings();
    this.provider.clearSelection();
    this.provider.clearData();
    this.provider.clearColumns();
  }

}

export default ARankingView;

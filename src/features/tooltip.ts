import { Configuration } from '../models/public/configuration';
import { DataItem } from '../models/public/data-item';

export class DomTooltip {
  private readonly el: HTMLElement;
  private visible: boolean = false;
  private lastContent: string = '';

  /**
   * @param containerEl - The chart's own container element. Tooltip is appended here.
   * @param instanceId - Debug identifier (e.g. "bcjs_a3f9"). Never used in querySelector.
   * @param config - Chart configuration for tooltip styling.
   */
  constructor(
    private readonly containerEl: HTMLElement,
    instanceId: string,
    config: Configuration
  ) {
    this.el = document.createElement('div');
    this.el.classList.add('bcjs-tooltip');
    this.el.dataset['instanceId'] = instanceId;

    // Ensure container is positioned for absolute child
    const containerPosition = window.getComputedStyle(containerEl).position;
    if (containerPosition === 'static') {
      containerEl.style.position = 'relative';
    }

    // Apply styles from config.tooltipOptions (with fallbacks)
    const opts = config.tooltipOptions ?? {};
    const getCssValue = (v: string | number | undefined, def: string): string =>
      v === undefined ? def : typeof v === 'number' ? `${v}px` : v;

    Object.assign(this.el.style, {
      position:       'absolute',
      display:        'none',
      visibility:     'hidden',
      opacity:        '0',
      pointerEvents:  opts.pointerEvents ?? 'none',
      padding:        getCssValue(opts.padding, '8px'),
      margin:         getCssValue(opts.margin, '0'),
      background:     opts.backgroundColor ?? 'rgba(0, 0, 0, 0.85)',
      color:          opts.fontColor ?? 'white',
      borderRadius:   '4px',
      fontFamily:     opts.fontFamily ?? 'Arial, sans-serif',
      fontSize:       getCssValue(opts.fontSize, '14px'),
      fontWeight:     String(opts.fontWeight ?? 400),
      fontStyle:      opts.fontStyle ?? 'normal',
      textAlign:      opts.textAlign ?? 'left',
      textDecoration: opts.textDecoration ?? 'none',
      textTransform:  opts.textTransform ?? 'none',
      letterSpacing:  getCssValue(opts.letterSpacing, 'normal'),
      boxShadow:      opts.boxShadow ?? 'none',
      maxWidth:       getCssValue(opts.maxWidth, '200px'),
      minWidth:       getCssValue(opts.minWidth, 'auto'),
      zIndex:         String(opts.zIndex ?? 1000),
      transition:     opts.transition ?? 'opacity 0.15s',
      backdropFilter: opts.backdropFilter ?? 'none',
      border: opts.borderStyle
        ? `${getCssValue(opts.borderWidth, '1px')} ${opts.borderStyle} ${opts.borderColor ?? 'transparent'}`
        : 'none',
    });

    // Append to THIS chart's container — not document.body
    this.containerEl.appendChild(this.el);
  }

  show(item: DataItem, clientX: number, clientY: number, config: Configuration): void {
    const content = this.buildContent(item, config);
    if (content !== this.lastContent) {
      this.el.innerHTML = content;
      this.lastContent = content;
    }

    // Position relative to container
    const containerRect = this.containerEl.getBoundingClientRect();
    const left = clientX - containerRect.left + 15;
    const top  = clientY - containerRect.top  + 15;

    this.el.style.left = `${left}px`;
    this.el.style.top  = `${top}px`;

    if (!this.visible) {
      this.el.style.display    = 'block';
      this.el.style.visibility = 'visible';
      this.el.style.opacity    = '1';
      this.visible = true;
    }
  }

  hide(): void {
    if (this.visible) {
      this.el.style.display    = 'none';
      this.el.style.visibility = 'hidden';
      this.el.style.opacity    = '0';
      this.visible = false;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  dispose(): void {
    this.el.remove();  // removes from container DOM
    this.visible = false;
  }

  private buildContent(item: DataItem, config: Configuration): string {
    const opts = config.tooltipOptions;

    // 1. Formatter function
    if (opts?.formatter && typeof opts.formatter === 'function') {
      return opts.formatter(item);
    }

    // 2. Default: label + value
    const label = item.label?.trim();
    if (label) {
      return `<div>${label}<br>Value: ${item.value}</div>`;
    }
    return `<div>${item.value}</div>`;
  }
}

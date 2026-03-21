import {
  Configuration,
  LayoutConfig,
  RenderConfig,
  InteractionConfig,
  AnimationConfig,
} from '../models/public/configuration';

/**
 * Default values for V2 config groups.
 * These are the runtime defaults — not exposed in types (TypeScript-level defaults are optional fields).
 */
export const DEFAULTS = {
  layout: {
    type: 'static' as const,
    physics: {
      centerStrength: 0.012,
      collisionPad:   3,
      velocityDecay:  0.82,
      wallStrength:   0.15,
      alphaDecay:     0.0228,
      alphaMin:       0.001,
      maxVelocity:    8,
      updateBehavior: 'restart' as const,
    },
  },
  render: {
    mode:                'auto' as const,
    theme:               'flat' as const,
    glassPerformanceHint: 'safe' as const,
  },
  interaction: {
    hoverScale:      1.08,
    hoverEase:       0.10,
    tooltipEnabled:  true,
  },
  animation: {
    entryDuration: 25,
  },
  // V1 compat defaults
  fontSize:            12,
  defaultFontColor:    '#ffffff',
  defaultFontFamily:   'Arial',
  defaultBubbleColor:  '#3498DB',
  minRadius:           10,
  maxLines:            'auto' as const,
  textWrap:            true,
  isResizeCanvasOnWindowSizeChange: true,
  showToolTip:         true,
};

/**
 * Normalizes user config — handles both V1 flat shorthand and V2 grouped config.
 * Returns a fully resolved Configuration with all defaults applied.
 * Does NOT validate — call validateConfig() first.
 */
export function normalizeConfig(
  userConfig: Partial<Configuration> & { canvasContainerId: string; data: any[] }
): Configuration {
  // Handle V1 theme shorthand (theme: "glass" → render.theme: "glass")
  const renderTheme = userConfig.theme ?? userConfig.render?.theme ?? DEFAULTS.render.theme;
  const renderMode  = userConfig.render?.mode ?? DEFAULTS.render.mode;
  const glassHint   = userConfig.render?.glassPerformanceHint ?? DEFAULTS.render.glassPerformanceHint;

  const layout: LayoutConfig = {
    type: userConfig.layout?.type ?? DEFAULTS.layout.type,
    ...(userConfig.layout?.physics !== undefined ? {
      physics: {
        ...DEFAULTS.layout.physics,
        ...userConfig.layout.physics,
      }
    } : {}),
  };

  const render: RenderConfig = {
    mode:                renderMode,
    theme:               renderTheme,
    glassPerformanceHint: glassHint,
  };

  const interaction: InteractionConfig = {
    hoverScale:      userConfig.interaction?.hoverScale     ?? DEFAULTS.interaction.hoverScale,
    hoverEase:       userConfig.interaction?.hoverEase      ?? DEFAULTS.interaction.hoverEase,
    tooltipEnabled:  userConfig.interaction?.tooltipEnabled ?? DEFAULTS.interaction.tooltipEnabled,
  };

  const animation: AnimationConfig = {
    entryDuration:     userConfig.animation?.entryDuration    ?? DEFAULTS.animation.entryDuration,
    transitionEasing:  userConfig.animation?.transitionEasing,
  };

  return {
    // Required
    canvasContainerId: userConfig.canvasContainerId,
    data:              userConfig.data,

    // V2 grouped
    layout,
    render,
    interaction,
    animation,
    debug:             userConfig.debug,

    // V2 callbacks
    onRendererResolved: userConfig.onRendererResolved,

    // V1 shorthand fields (preserved for compat)
    fontSize:            userConfig.fontSize            ?? DEFAULTS.fontSize,
    defaultFontColor:    userConfig.defaultFontColor    ?? DEFAULTS.defaultFontColor,
    defaultFontFamily:   userConfig.defaultFontFamily   ?? DEFAULTS.defaultFontFamily,
    defaultBubbleColor:  userConfig.defaultBubbleColor  ?? DEFAULTS.defaultBubbleColor,
    colorPalette:        userConfig.colorPalette,
    canvasBackgroundColor: userConfig.canvasBackgroundColor,
    canvasBorderColor:   userConfig.canvasBorderColor,
    minRadius:           userConfig.minRadius           ?? DEFAULTS.minRadius,
    maxLines:            userConfig.maxLines            ?? DEFAULTS.maxLines,
    textWrap:            userConfig.textWrap            ?? DEFAULTS.textWrap,
    isResizeCanvasOnWindowSizeChange:
      userConfig.isResizeCanvasOnWindowSizeChange ?? DEFAULTS.isResizeCanvasOnWindowSizeChange,
    showToolTip:         userConfig.showToolTip         ?? DEFAULTS.showToolTip,
    cursorType:          userConfig.cursorType,
    tooltipOptions:      userConfig.tooltipOptions,
    bubbleAppearance:    userConfig.bubbleAppearance,
    fontOptions:         userConfig.fontOptions,

    // V1 deprecated (pass through — orchestrator will warn)
    onBubbleClick:       userConfig.onBubbleClick,

    // Theme shorthand (maps to render.theme above — also stored for reference)
    theme:               renderTheme,
  };
}

/**
 * @deprecated V1 compat alias. Use normalizeConfig().
 */
export function mergeConfig(
  customConfig: { canvasContainerId: string; data: any[] } & Partial<Configuration>
): Configuration {
  return normalizeConfig(customConfig);
}

const OVERLAY_STACK_KEY = '__sgOverlayStackState__';
export const OVERLAY_STACK_BASE = 140;
export const OVERLAY_STACK_STEP = 20;

function getOverlayStackState() {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!window[OVERLAY_STACK_KEY]) {
        window[OVERLAY_STACK_KEY] = {
            nextBase: OVERLAY_STACK_BASE - OVERLAY_STACK_STEP
        };
    }

    return window[OVERLAY_STACK_KEY];
}

export function claimOverlayStackBase() {
    const state = getOverlayStackState();
    if (!state) {
        return OVERLAY_STACK_BASE;
    }

    const nextBase = state.nextBase + OVERLAY_STACK_STEP;
    state.nextBase = nextBase > 4000 ? OVERLAY_STACK_BASE : nextBase;
    return state.nextBase;
}

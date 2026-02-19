
export interface StopLoss {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

export interface TakeProfit {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

export interface TrailingStopLoss {
    enabled: boolean;
    type: 'points' | '%' | 'Spot %';
    value: string;
    ref: 'CLOSE' | 'OPEN' | 'BOTH';
}

export interface StrategyLeg {
    id: string;
    type: 'CE' | 'PE';
    action: 'BUY' | 'SELL';
    strikeSelection: 'ATM' | 'ATM_PLUS' | 'ATM_MINUS';
    strikeRounding: 'AUTO' | 'DOWN' | 'UP';
    strikeOffsetType: '%' | 'Pt';
    strikeOffset: string;
    selectBy: 'STRIKE' | 'PREMIUM';
    targetPremium: string;
    premiumTolerance: string;
    minPremium: string;
    maxPremium: string;
    priceBoundaryEnabled: boolean;
    lotMultiplier: number;
    stopLoss: StopLoss;
    takeProfit: TakeProfit;
    trailingStopLoss: TrailingStopLoss;
}

export interface EntryCriteria {
    mode: 'EXPIRY_BASED' | 'DAILY';
    daysBeforeExpiry: string; // "0" for Expiry Day, "1" for 1 Day Before
    holidayEntryMode: 'PREVIOUS' | 'NONE' | 'NEXT';
    priceRef: 'CLOSE' | 'OPEN';
    minVolume: string;
    waitAndTrade: {
        enabled: boolean;
        type: 'INCREASE' | 'DECREASE';
        value: string;
        ref: 'PREV_CLOSE' | 'TODAY_OPEN' | 'PREV_OPEN' | 'XTH_DAY_OPEN' | 'XTH_DAY_CLOSE';
        refDays: string;
    };
}

export interface ExitCriteria {
    type: 'DAYS_BEFORE_EXPIRY';
    dailyExitType?: 'SAME_DAY' | 'NEXT_DAY' | 'AFTER_DAYS';
    dailyExitDays?: string;
    daysBeforeExpiry: string;
    exitTimeRef: 'CLOSE' | 'OPEN';
    allowReentry: boolean;
    riskManagementMode: 'GLOBAL' | 'LEG_WISE';
    stopLoss: StopLoss;
    takeProfit: TakeProfit;
    trailingStopLoss: TrailingStopLoss;
}

export interface OptionStrategyData {
    name: string;
    description: string;
    configuration: {
        entry: EntryCriteria;
        exit: ExitCriteria;
        legs: StrategyLeg[];
    };
}

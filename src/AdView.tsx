import React, { useEffect, useState } from 'react';
import { NativeModules, requireNativeComponent, StyleSheet } from 'react-native';
import type { ViewProps, ViewStyle, StyleProp } from 'react-native';
import type { AdDisplayFailedInfo, AdInfo, AdLoadFailedInfo, AdRevenueInfo } from './types/AdInfo';
import type { AdNativeEvent } from './types/AdEvent';
import type { AdViewProps } from './types/AdViewProps';

const { AppLovinMAX } = NativeModules;

const {
    BANNER_AD_FORMAT_LABEL,
    MREC_AD_FORMAT_LABEL,

    TOP_CENTER_POSITION,
    TOP_LEFT_POSITION,
    TOP_RIGHT_POSITION,
    CENTERED_POSITION,
    CENTER_LEFT_POSITION,
    CENTER_RIGHT_POSITION,
    BOTTOM_LEFT_POSITION,
    BOTTOM_CENTER_POSITION,
    BOTTOM_RIGHT_POSITION,
} = AppLovinMAX.getConstants();

/**
 * Defines a format of an ad.
 */
export enum AdFormat {
    /**
     * Banner ad.
     */
    BANNER = BANNER_AD_FORMAT_LABEL,

    /**
     * MREC ad.
     */
    MREC = MREC_AD_FORMAT_LABEL,
}

/**
 * Defines a position of a banner or MREC ad.
 */
export enum AdViewPosition {
    TOP_CENTER = TOP_CENTER_POSITION,
    TOP_LEFT = TOP_LEFT_POSITION,
    TOP_RIGHT = TOP_RIGHT_POSITION,
    CENTERED = CENTERED_POSITION,
    CENTER_LEFT = CENTER_LEFT_POSITION,
    CENTER_RIGHT = CENTER_RIGHT_POSITION,
    BOTTOM_LEFT = BOTTOM_LEFT_POSITION,
    BOTTOM_CENTER = BOTTOM_CENTER_POSITION,
    BOTTOM_RIGHT = BOTTOM_RIGHT_POSITION,
}

type AdViewNativeEvents = {
    onAdLoadedEvent(event: AdNativeEvent<AdInfo>): void;
    onAdLoadFailedEvent(event: AdNativeEvent<AdLoadFailedInfo>): void;
    onAdDisplayFailedEvent(event: AdNativeEvent<AdDisplayFailedInfo>): void;
    onAdClickedEvent(event: AdNativeEvent<AdInfo>): void;
    onAdExpandedEvent(event: AdNativeEvent<AdInfo>): void;
    onAdCollapsedEvent(event: AdNativeEvent<AdInfo>): void;
    onAdRevenuePaidEvent(event: AdNativeEvent<AdRevenueInfo>): void;
};

const AdViewComponent = requireNativeComponent<AdViewProps & ViewProps & AdViewNativeEvents>('AppLovinMAXAdView');

const ADVIEW_SIZE = {
    banner: { width: 320, height: 50 },
    leader: { width: 728, height: 90 },
    mrec: { width: 300, height: 250 },
};

const getOutlineViewSize = (style: StyleProp<ViewStyle>) => {
    const viewStyle = StyleSheet.flatten(style || {});
    return [viewStyle?.width, viewStyle?.height];
};

const sizeAdViewDimensions = (
    adFormat: AdFormat,
    adaptiveBannerEnabled?: boolean,
    width?: number | string,
    height?: number | string
): Promise<Record<string, number>> => {
    const sizeForBannerFormat = async () => {
        const isTablet = await AppLovinMAX.isTablet();

        const minWidth = isTablet ? ADVIEW_SIZE.leader.width : ADVIEW_SIZE.banner.width;

        let minHeight;
        if (adaptiveBannerEnabled) {
            if (typeof width === 'number' && width > minWidth) {
                minHeight = await AppLovinMAX.getAdaptiveBannerHeightForWidth(width);
            } else {
                minHeight = await AppLovinMAX.getAdaptiveBannerHeightForWidth(minWidth);
            }
        } else {
            minHeight = isTablet ? ADVIEW_SIZE.leader.height : ADVIEW_SIZE.banner.height;
        }

        return Promise.resolve({
            ...(width === 'auto'
                ? {
                      width: minWidth,
                  }
                : {
                      minWidth: minWidth,
                  }),
            ...(height === 'auto'
                ? {
                      height: minHeight,
                  }
                : {
                      minHeight: minHeight,
                  }),
        });
    };

    if (adFormat === AdFormat.BANNER) {
        return sizeForBannerFormat();
    } else {
        return Promise.resolve({
            ...(width === 'auto'
                ? {
                      width: ADVIEW_SIZE.mrec.width,
                  }
                : {
                      minWidth: ADVIEW_SIZE.mrec.width,
                  }),
            ...(height === 'auto'
                ? {
                      height: ADVIEW_SIZE.mrec.height,
                  }
                : {
                      minHeight: ADVIEW_SIZE.mrec.height,
                  }),
        });
    }
};

/**
 * The {@link AdView} component that you use building a banner or an MREC. Phones
 * sizes banners to 320x50 and MRECs to 300x250. Tablets sizes banners to 728x90 and MRECs to
 * 300x250. You may use the utility method {@link AppLovinMAX.isTablet()} to help with view sizing
 * adjustments. For adaptive banners, call {@link BannerAd.getAdaptiveHeightForWidth()} to get
 * the banner height, and then adjust your content accordingly.
 *
 * ### Example:
 * ```js
 * <AdView
 *   adUnitId={adUnitId}
 *   adFormat={AdFormat.BANNER}
 *   placement="my_placement"
 *   customData="my_customData"
 *   extraParameters={{"key1":"value1", "key2":"value2"}}
 *   localExtraParameters={{"key1":123", "key2":object}}
 *   adaptiveBannerEnabled={false}
 *   autoRefresh={false}
 *   style={styles.banner}
 *   onAdLoaded={(adInfo: AdInfo) => { ... }}
 * />
 * ```
 */
export const AdView = ({
    adUnitId,
    adFormat,
    placement,
    customData,
    adaptiveBannerEnabled = true,
    autoRefresh = true,
    extraParameters,
    localExtraParameters,
    onAdLoaded,
    onAdLoadFailed,
    onAdDisplayFailed,
    onAdClicked,
    onAdExpanded,
    onAdCollapsed,
    onAdRevenuePaid,
    style,
    ...otherProps
}: AdViewProps & ViewProps) => {
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [dimensions, setDimensions] = useState({});

    useEffect(() => {
        AppLovinMAX.isInitialized().then((result: boolean) => {
            setIsInitialized(result);
            if (!result) {
                console.warn('AdView is mounted before the initialization of the AppLovin MAX React Native module');
            }
        });
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        const [width, height] = getOutlineViewSize(style);
        sizeAdViewDimensions(adFormat, adaptiveBannerEnabled, width, height).then((value: Record<string, number>) => {
            setDimensions(value);
        });
    }, [isInitialized]);

    const onAdLoadedEvent = (event: AdNativeEvent<AdInfo>) => {
        if (onAdLoaded) onAdLoaded(event.nativeEvent);
    };

    const onAdLoadFailedEvent = (event: AdNativeEvent<AdLoadFailedInfo>) => {
        if (onAdLoadFailed) onAdLoadFailed(event.nativeEvent);
    };

    const onAdDisplayFailedEvent = (event: AdNativeEvent<AdDisplayFailedInfo>) => {
        if (onAdDisplayFailed) onAdDisplayFailed(event.nativeEvent);
    };

    const onAdClickedEvent = (event: AdNativeEvent<AdInfo>) => {
        if (onAdClicked) onAdClicked(event.nativeEvent);
    };

    const onAdExpandedEvent = (event: AdNativeEvent<AdInfo>) => {
        if (onAdExpanded) onAdExpanded(event.nativeEvent);
    };

    const onAdCollapsedEvent = (event: AdNativeEvent<AdInfo>) => {
        if (onAdCollapsed) onAdCollapsed(event.nativeEvent);
    };

    const onAdRevenuePaidEvent = (event: AdNativeEvent<AdRevenueInfo>) => {
        if (onAdRevenuePaid) onAdRevenuePaid(event.nativeEvent);
    };

    // Not initialized
    if (!isInitialized) {
        return null;
    } else {
        const isDimensionsSet = Object.keys(dimensions).length > 0;

        // Not sized yet
        if (!isDimensionsSet) {
            return null;
        }
    }

    return (
        <AdViewComponent
            adUnitId={adUnitId}
            adFormat={adFormat}
            placement={placement}
            customData={customData}
            adaptiveBannerEnabled={adaptiveBannerEnabled}
            autoRefresh={autoRefresh}
            extraParameters={extraParameters}
            localExtraParameters={localExtraParameters}
            onAdLoadedEvent={onAdLoadedEvent}
            onAdLoadFailedEvent={onAdLoadFailedEvent}
            onAdDisplayFailedEvent={onAdDisplayFailedEvent}
            onAdClickedEvent={onAdClickedEvent}
            onAdExpandedEvent={onAdExpandedEvent}
            onAdCollapsedEvent={onAdCollapsedEvent}
            onAdRevenuePaidEvent={onAdRevenuePaidEvent}
            style={Object.assign({}, style, dimensions)}
            {...otherProps}
        />
    );
};

//
// MDL style Slider component.
//
// - @see [MDL Slider](http://www.getmdl.io/components/index.html#sliders-section)
// - [Props](#props)
// - [Defaults](#defaults)
//
// Created by ywu on 15/8/23.
//

import React, {
  Component,
  PropTypes,
} from 'react';

import {
  Animated,
  PanResponder,
  View,
} from 'react-native';

import { getTheme } from '../theme';
import Thumb from '../internal/Thumb';

// The max scale of the thumb
const THUMB_SCALE_RATIO = 1.3;

// Width of the thumb border
const THUMB_BORDER_WIDTH = 0;

// extra spacing enlarging the touchable area
const TRACK_EXTRA_MARGIN_V = 5;
const TRACK_EXTRA_MARGIN_H = 0;

const BASIC_HEIGHT_V = 25;

// ## <section id='Slider'>Slider</section>
class Slider extends Component {
  // region Static property initializers
  // ## <section id='props'>Props</section>
  static propTypes = {
    // [RN.View Props](https://facebook.github.io/react-native/docs/view.html#props)...
    ...View.propTypes,

    // Minimum value of the range, default is `0`
    min: PropTypes.number,

    // Maximum value of the range, default is `100`
    max: PropTypes.number,

    // Current value
    value: PropTypes.number,

    // The thickness of the Slider track
    trackSize: PropTypes.number,

    // Radius of the thumb of the Slider
    thumbRadius: PropTypes.number,

    // Color of the lower part of the track, it's also the color of the thumb
    lowerTrackColor: PropTypes.string,

    // Color of the upper part of the track
    upperTrackColor: PropTypes.string,

    // Callback when value changed
    onChange: PropTypes.func,

    // Callback when the value is confirmed
    onConfirm: PropTypes.func,
  };

  // ## <section id='defaults'>Defaults</section>
  static defaultProps = {
    thumbRadius: 6,
    trackSize: 2,
    min: 0,
    max: 100,
  };
  // endregion

  constructor(props) {
    super(props);
    this.theme = getTheme();
    this._value = props.value || 0 ;
    this._trackTotalLength = 0;
    this._prevPointerX = 0;
    this._animatedTrackLength = new Animated.Value(0);
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        //this.refs.thumb.maximize();
        this._prevPointerX = evt.nativeEvent.locationX;
        this._onTouchEvent({
          type: 'TOUCH_DOWN',
          x: this._prevPointerX,
        });
      },
      onPanResponderMove: (evt, gestureState) => {
        this._onTouchEvent({
          type: 'TOUCH_MOVE',
          x: this._prevPointerX + gestureState.dx,
        });
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (evt, gestureState) => {
        this._onPanResponderEnd(gestureState);
      },
      onPanResponderTerminate: (evt, gestureState) => {
        this._onPanResponderEnd(gestureState, true);
      },
      onShouldBlockNativeResponder: () => true,
    });
  }

  componentWillMount() {
    this._onThumbRadiiUpdate(this.props);
    //this._internalSetValue(this.props.value, true);
  }

  componentDidMount(){
    // this.refs.thumb.moveToProg(this.x, this._trackTotalLength);
  }

  componentWillReceiveProps(nextProps) {
    this._onThumbRadiiUpdate(nextProps);
    // this._internalSetValue(nextProps.value, false);
  }

  // region Property initializers
  _onTrackLayout = ({ nativeEvent: { layout: { width } } }) => {
    if (this._trackTotalLength !== width) {
      this._trackTotalLength = width;
      this._aniUpdateValue(this.value);
    }
  };
  // endregion

  _internalSetValue(value, fireChange = true) {
    if (fireChange) {
      this._value = value;
      this._emitChange(value);
    }
  }

  _emitChange(newValue) {
    if (this.props.onChange) {
      this.props.onChange(newValue);
    }
  }

  _emitConfirm() {
    if (this.props.onConfirm) {
      this.props.onConfirm(this._value);
    }
  }

  _aniUpdateValue(value) {
    if (!this._trackTotalLength) {
      return;
    }
    const ratio = (value - this.props.min) / (this.props.max - this.props.min);
    const x = ratio * this._trackTotalLength;
    this._moveThumb(x, true);
  }

  _onPanResponderEnd(gestureState, cancelled) {
    if (!cancelled) {
      this._prevPointerX = this._prevPointerX + gestureState.dx;
    }

    this._onTouchEvent({
      type: cancelled ? 'TOUCH_CANCEL' : 'TOUCH_UP',
      x: this._prevPointerX,
    });
  }

  maximizeThumb() {
    this.refs.thumb.maximize(350);
  }

  minimizeThumb() {
    this.refs.thumb.minimize(350);
  }

  // Touch events handling
  _onTouchEvent(evt) {
    this.isUserUsingBar = false;
    switch (evt.type) {
      case 'TOUCH_DOWN':
      case 'TOUCH_MOVE':
        this._updateValueByTouch(evt);
        this.isUserUsingBar = true;
        break;
      case 'TOUCH_UP':
        this._confirmUpdateValueByTouch(evt);
        break;
      case 'TOUCH_CANCEL':
        // should not use the coordination inside a cancelled event
        this._confirmUpdateValueByTouch();
        break;
      default:
        break;
    }
  }

  // get touch position relative to the track
  _getTouchOnTrack(evt) {
    // touch location relative to the track
    let x = Math.max(evt.x, 0);
    x = Math.min(x, this._trackTotalLength); // - this._thumbRadiiWithBorder * 2

    const ratio = x / this._trackTotalLength;

    return { x, ratio };
  }

  _updateValueByTouch(evt) {
    // console.log(evt);
    const { x, ratio } = this._getTouchOnTrack(evt);
    const _value = ratio * (this.props.max - this.props.min) + this.props.min;
    this._internalSetValue(_value);  // report changes in 'real-time'
    // console.log(this._value);
    //this.refs.thumb.maximize();
    this._moveThumb(x);
  }

  _confirmUpdateValueByTouch(evt) {
    if (evt) {
      const { x } = this._getTouchOnTrack(evt);
      this.refs.thumb.confirmMoveTo(x);
    } else {
      this.refs.thumb.confirmMoveTo();
    }
    this._emitConfirm();
  }

  _moveThumb(x, programatically = false) {
    if (programatically)
      this.refs.thumb.moveToProg(x, this._trackTotalLength);
    else
      this.refs.thumb.moveTo(x, this._trackTotalLength);

    Animated.timing(this._animatedTrackLength, {
      toValue: x,
      duration: 0,
    }).start();
  }

  // when thumb radii updated, re-calc the dimens
  _onThumbRadiiUpdate(props) {
    this._thumbRadii = props.thumbRadius;
    this._thumbRadiiWithBorder = this._thumbRadii + THUMB_BORDER_WIDTH;
    this._trackMarginV = BASIC_HEIGHT_V + // THUMB_SCALE_RATIO + // this._thumbRadiiWithBorder 
      TRACK_EXTRA_MARGIN_V - this.props.trackSize / 2;
    this._trackMarginH = 0 //this._thumbRadiiWithBorder; 
    // TRACK_EXTRA_MARGIN_H;
  }

  render() {
    // making room for the Thumb, cause's Android doesn't support `overflow: visible`
    // - @see http://bit.ly/1Fzr5SE
    const trackMargin = {
      marginLeft: 0,
      marginRight: 0,
      marginTop: this._trackMarginV,
      marginBottom: this._trackMarginV,
    };

    const sliderStyle = this.theme.sliderStyle;
    const lowerTrackColor = this.props.lowerTrackColor || sliderStyle.lowerTrackColor;
    const upperTrackColor = this.props.upperTrackColor || sliderStyle.upperTrackColor;

    return (
      <View ref="container"
        style={[this.props.style, {
          padding: 0,
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
        }]}
        pointerEvents="box-only"
        {...this._panResponder.panHandlers}
        >
        <View ref="track"
          style={{
            height: this.props.trackSize,
            backgroundColor: upperTrackColor,
            ...trackMargin,
        }}
        onLayout={this._onTrackLayout}
        >
        <Animated.View
          ref="lowerTrack"
          style={{
            position: 'absolute',
            width: this._animatedTrackLength,
            height: this.props.trackSize,
            backgroundColor: lowerTrackColor,
          }}
          />
      </View>
      <Thumb
        ref="thumb"
        radius={this.props.thumbRadius}
        trackSize={this.props.trackSize}
        trackLength={this._trackTotalLength}
        trackMarginH={this._trackMarginH}
        enabledColor={lowerTrackColor}
        style={{
          top: BASIC_HEIGHT_V + TRACK_EXTRA_MARGIN_V - this._thumbRadiiWithBorder
        }}
        />
      </View >
    );
  }
}
//+ this._thumbRadiiWithBorder * THUMB_SCALE_RATIO + TRACK_EXTRA_MARGIN_V,
//BASIC_HEIGHT_V/2 * (THUMB_SCALE_RATIO - 1) + TRACK_EXTRA_MARGIN_V,
// Public api to update the current value
Object.defineProperty(Slider.prototype, 'value', {
  set(value) {
    if (!this.isUserUsingBar) {
      this._internalSetValue(value, false);
      this._aniUpdateValue(value);
    }
  },
  get() {
    return this._value;
  },
  enumerable: true,
});


// ## Public interface
module.exports = Slider;

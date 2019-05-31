/**
 * 1. 系统按需注入状态功能。
 * 2. 提供组件的复用功能。
 * 3. 简化业务开发代码。
 * 4. 控制渲染机制。
 */
import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import {combineReducers} from 'redux-immutable'
import immutableReducer from 'redux-immutable-reducer';
import qs from 'qs';
import {Logger} from './frame';
import * as _ from 'lodash';

/**
 *  定义类库常量
 */
const CONST={
    // 定义模块属性名称
    MODULE_NAME_PROP:'__module',
    // 默认命名空间
    DEFAULT_NAMESPACE_NAME:'__default',
    // 自定义参数扩展参数
    ACTION_OPTION_NAME:'__option',
    // 设置action的类型 配合redux初始化的参数处理
    ACTION_TYPE:'type',
    // 设置action参数位置
    ACTION_PARAM:'__param',
    // 记录位置
    NAMESPACE_NAME:'NAMESPACE',
}


var class2type = {};

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var isPlainObject =  obj =>{
    var proto, Ctor;
    if ( !obj || toString.call( obj ) !== "[object Object]" ) {
        return false;
    }
    proto = Object.getPrototypeOf( obj );
    if ( !proto ) {
        return true;
    }
    Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
    return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
};

const isEmptyObject =  obj => {
    var name;
    for ( name in obj ) {
        return false;
    }
    return true;
};


let getStorage = ()=>{
    window.frame.NAMESPACE || (window.frame.NAMESPACE = {});
    return window.frame.NAMESPACE;
}

let recordNamespace = (aliasNamespace,realNameSpace)=>{
    let storeage = getStorage();
    storeage[aliasNamespace] = realNameSpace;
}

let getRealNameSpace = (namespace)=> {
    let storeage = getStorage();
    return storeage[namespace] || namespace;
}


/**
 * 数组直接替换处理
 * 不存在状态包含数组时，不做任何处理 返回false
 * 存在数组时，返回 
 * {
 *  keys = [[a,a1,a2],[b],[c]]
 *  values = [value,value,value],
 * }
 * @param {*} totalArray 
 * 
 */
const  totalArray= (stateData,keys=[])=>{
    if(!isPlainObject(stateData) && isEmptyObject(stateData)) return false;
    let res  = {key:[],value:[]};
    let flag = false;
    for(var key in stateData){
        let value =stateData[key];
        if(Array.isArray(value)){
            flag = true;
            let _keys = keys.slice();
            _keys.push(key);
            res.key.push(_keys);
            res.value.push(value);
        }
        if(isPlainObject(value) && !isEmptyObject(value)){
            let _keys = keys.slice();
            _keys.push(key);
            let result = totalArray(value,_keys);
            if(result){
                flag = true;
                res.key = res.key.concat(result.key);
                res.value = res.value.concat(result.value);
            }
        }   
    }
    return flag && res; 
}

const mergeDeepWithOutArray=(state,param)=>{
    let includeArray = totalArray(param);
    let newState = state.mergeDeep(param);
    if(!includeArray) return newState;
    includeArray.key.map((key,index)=> newState = newState.setIn(key,includeArray.value[index]));
    return newState;
}

/**
 *  模型与React组件(UI组件、业务组件) 集合
 *  
 * @param {*} model  模块模型
 * 
 * {
 *   moduleName:'模块名称',
 *   initState: '组件初始化状态'
 *   stateToProps：'状态作为属性'
 *   actionToProps：(...function) : '动作(方法)作为属性'
 * }
 * 
 */
export let connect = model=> {
    let {initState,initProps, stateToProps=(state)=>state ,
        ...actionToProps} = model;    
    let {..._initState} = initState;
    let namespace = (Math.random()+'');
    let reducer = (state=_initState,action)=>{
        return action[CONST.ACTION_TYPE] === namespace ?
        mergeDeepWithOutArray(state,action[CONST.ACTION_PARAM]):state
    } 
    let mapDispatchToProps=()=> actionToProps;
    return injectionReducer(namespace,stateToProps,mapDispatchToProps,reducer,{initProps});
}


/**
 * 信道处理reducer生效
 * 指定namespace命名空间下的reducer才生效，指定模块生效
 * @param {*} reducers 
 * @param {*} moduleName 
 */
const channelReducer = (reducers) => {
    let newReducers = {};
    Object.keys(reducers).forEach(function(namespace) {
        newReducers[namespace] = immutableReducer((previousStateForKey, action) => {
            if (namespace && action[CONST.ACTION_OPTION_NAME] && namespace != action[CONST.ACTION_OPTION_NAME].namespace) {
                return previousStateForKey;
            }
            return reducers[namespace](previousStateForKey, action);
        });
    });
    return combineReducers(newReducers);
}


/**
 *  组合reducer树形结构。
 *  将新reducer注入到原有的reducer中。
 * @param {*} reducers 
 */
const combineModuleReducer = (reducers) => {
    let modules = reducers[CONST.MODULE_NAME_PROP];
    if (!modules) return combineReducers(reducers);
    let moduleReducer = channelReducer(modules);
    let newReducers = {...reducers };
    newReducers[CONST.MODULE_NAME_PROP] = moduleReducer;
    return combineReducers(newReducers);
}

/**
 * 自定义actioncreator。
 * 函数式组合方法getstate，setstate到action中。
 * 便捷业务模块开发。
 * @param {*} actionCreator 
 * @param {*} setState 
 * @param {*} getState 
 */
function bindActionCreator(actionCreator, setState, getState) {
    return function () {
      let actionResult =  actionCreator.apply(undefined, arguments);
      if(typeof actionResult === 'function' ){
        actionResult(setState, getState);
      }
    };
  }

/**
 * 批量注入自定义方法。
 * @param {*} actionCreators 
 * @param {*} setState 
 * @param {*} getState 
 */
function bindActionCreators(actionCreators, setState,getState) {
    if (typeof actionCreators === 'function') return bindActionCreator(actionCreators, setState,getState);
    if (typeof actionCreators !== 'object' || actionCreators === null) {
      throw new Error('bindActionCreators expected an object or a function, instead received ' + 
      (actionCreators === null ? 'null' : typeof actionCreators) + '. ');
    }
    var keys = Object.keys(actionCreators);
    var boundActionCreators = {};
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var actionCreator = actionCreators[key];
      if (typeof actionCreator === 'function') {
        boundActionCreators[key] = bindActionCreator(actionCreator, setState,getState);
      }
    }
    return boundActionCreators;
  }

/**
 *  高阶组件动态注入reducer
 * @param {*} moduleName  模块名称 若不指定 则为随即数 一次性 一般都指定名称
 * @param {*} mapStateToProps  // 特殊情况下状态设置 默认获取当前模块下的样式
 * @param {*} mapDispatchToProps  // 所有交互动作
 * @param {*} reducer  // 当前模块对应的reducer
 * @param {*} mergeProps // reducer
 */

export let injectionReducer = (namespace, mapStateToProps, mapDispatchToProps, reducer, mergeProps) => {
        let newReducer = {...frame.reducer};
        let moduleReducers = newReducer[CONST.MODULE_NAME_PROP] || {};
        moduleReducers[namespace] = reducer;
        newReducer[CONST.MODULE_NAME_PROP] = moduleReducers;
        frame.reducer = newReducer;
        Logger.frame('info','replaceReducer',namespace);
        frame.store.replaceReducer(combineModuleReducer(newReducer));
        let { initProps , _mergeProps}= mergeProps;
        return reduxWithConnect(mapStateToProps, mapDispatchToProps, 
         _mergeProps, { _namespace:namespace,props:{}, initProps });
}


/**
 *  redux连接React组件
 * @param {*} mapStateToProps state属性
 * @param {*} mapDispatchToProps  action属性
 * @param {*} mergeProps 覆盖属性
 * @param {*} option 附加属性
 */
let reduxWithConnect = (mapStateToProps, mapDispatchToProps, mergeProps, option) => {
    let {_namespace, initProps,props } = option;
    /**
     *  获取系统状态
     * @param {*} moduleName  模块名称  默认当前模块
     * @param {*} namespace   命名空间 默认为默认命名空间__default
     * @param {*} area  后续扩展 开辟其他  默认为模块区域
     * 1: 获取当前模块状态   getState() 默认获取当前命名空间、当前模块、当前区域的状态
     * 2: 获取指定模块   getState(moduleName)
     * 3: 获取指定模块的指定实例 getState(moduleName)
     * 4: 获取指定区域 getState(false,false,areaName)  // 获所有模块的数据  // 后续完善
     * 6：获取系统全部状态 getState(,,true)
     * 7：便捷获取 getState(model)
     */
    // let _getState = (argModuleName = moduleName,argNamespace=namespace,areaName=CONST.MODULE_NAME_PROP)=>{
    let _defaultOption={namespace:_namespace,areaName:CONST.MODULE_NAME_PROP};
    let _getState = (argNamespace= _namespace,opt={}, def={})=>{
        opt.namespace = argNamespace;
        let _opt = {..._defaultOption,def,...opt};
        let {namespace,areaName} = _opt;
        namespace = getRealNameSpace(namespace);
        let state  =  frame.store.getState().toJS();
        let currentState = null;
        // 系统所有状态
        if(areaName === true) return state;
        // 指定区域所有模块
        if(namespace === true) return state[areaName] ;
        // 指定命名空间 
        try{
            currentState = state[areaName][namespace] ;
        }catch(e){
            Logger.frame('warn',areaName,namespace,'not find state! please use right namespace!')
        }
        return currentState;
    }
    /**
     * 扩展获取属性状态函数 集成immutable。
     * 提供便捷获取工程所有状态接口
     * @param {*} _reduxMapState 
     */
    const getMapStateToProps = (_reduxMapState) => {
        // 加入imutable后统一处理
        let reduxMapState = _reduxMapState.toJS();
        let allModuleReduxMapState = reduxMapState[CONST.MODULE_NAME_PROP] || {};
            // 不存在模块状态 返回所有状态 兼容原始redux
        let namespaceReduxMapState =  allModuleReduxMapState[_namespace] ;
        return mapStateToProps ? mapStateToProps(namespaceReduxMapState,
                {getState:_getState,
                    mStates:allModuleReduxMapState,
                    state:reduxMapState}) : {};
    }

    let _setState;


    /**
     *  1. 触发动作扩展action属性，进行信道处理
     *  2. 提供编辑setState方法，返璞归真react组件。
     */
    const getMapDispatchToProps = mapDispatchToProps ?
        (_dispatch, getState) => {
            let dispatch = (action) => {
                // TODO 后续考虑中间件非对象形式
                if (typeof action == 'object') {
                    let newAction = {...action}
                    newAction[CONST.ACTION_OPTION_NAME] = {namespace}
                    return _dispatch(newAction);
                }
                return _dispatch(action);
            }
            // let configDispatchToProps = mapDispatchToProps(dispatch, getState);
            let _configDispatchToProps = mapDispatchToProps(dispatch, getState);
            // 设置模块的初始化方法
            let {init,...configDispatchToProps}=_configDispatchToProps;
            let newDispatchToProps = {};
            let defaultOption={namespace:_namespace,areaName:CONST.MODULE_NAME_PROP};
            _setState=(state,opt={},def={})=>{
                typeof opt === 'string' && (opt={namespace:opt})
                let _opt = {...defaultOption,def,...opt};
                let {namespace} = _opt;
                if(typeof state=== 'undefined'){
                    Logger.frame('error',namespace,'setState need object param!')
                    return undefined;
                }
                let actionParam = {};
                actionParam[CONST.ACTION_PARAM] = state
                actionParam[CONST.ACTION_TYPE] = namespace
                _dispatch(actionParam);
            }
            for (let key in configDispatchToProps) {
                newDispatchToProps[key] = key === 'dispatch' ? dispatch : 
                bindActionCreators(configDispatchToProps[key], _setState, _getState);
            }
            init && init(_setState, _getState);
            return () => (newDispatchToProps);
        } : mapDispatchToProps;

    return function wrapWithConnect(WrappedComponent) {
        class FrameConnect extends Component {
            constructor(props){
                super(props)
                this.props.namespace && recordNamespace(namespace,_namespace);
            }
            shouldComponentUpdate = nextProps=>!_.isEqual(this.props, nextProps);
            render() {
                    const { location, ...props } = this.props;
                    let search = location && location.search;
                    let param = qs.parse(search, { ignoreQueryPrefix: true, plainObjects: true });
                    initProps && initProps(this.props);
                    return ( <WrappedComponent getState={_getState} setState={_setState} param = { param }
                        location = { location } {...props }/>);
            }
        }
        // let _mergeProps = undefined;
        let _mergeProps =  (stateProps,dispatchProps,ownProps) => {
             let res = {...stateProps,...dispatchProps,props,...ownProps};
             return res;
         }
        return reduxConnect(getMapStateToProps, getMapDispatchToProps, _mergeProps)(FrameConnect);
    };
};


export const bind = (fn,arg={})=>(arg1,arg2)=>{
        let _arg = typeof arg === 'string' ? {moduleName:arg} :arg;
        return fn && fn(arg1,arg2,_arg);
}
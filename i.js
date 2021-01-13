document.addEventListener('DOMContentLoaded', function() { 
    window.ijs = new Ijs();
});
  
function iJS (conf = null) {
    if (!window.ijs) {
        setTimeout(() => {
            iJS(conf);
        },1);
    } else if (conf) {
        window.ijs.ConfInit(conf);
    }
}
class Ijs {
    constructor() {
        this.timer = new Date();
        this.apiObject = new Ijs_Array();
        this.events = [];
        this.classes = [];
        this.data = [];
        this.keys = {};

        this.helps = {
            data: [],
            keys: {},
            helpKeys: {},
            objects: []
        };
        this.models = new Ijs_Object();
        this.textContentReg = /{([\s\S]*?)}/gm;
        this.numberReg = /\.([0-9]*?)\./gm;
        this.classPathReg = /{{([\s\S]*?)}}/gm;
        this.paramsReg = /\(([\s\S][^(]*?)\)/gm;
        this.maksParamsReg = /\((.*)\)/gm;
        this.funcReg = /^([\s\S]*?)\(/gm;
        this.updateTimer = null;
        this.updateIds = {};
        this.updateConditionIds = {};
        this.updateIfIds = {};
        this.LocalDataInit({
            loading: {},
        });
        this.Run();
    }
    //INIT CONF
    ConfInit = (conf) => {
        if (conf.methods) this.models.addFunctions(conf.methods);
        window.$f = this.models.functions;
        if (conf.data) this.LocalDataInit(conf.data);
    }
    //INIT APLICATION
    Run = () => {
        this.PageAnalyze();
        this.AddCatchHref();
    }
    //INIT:)
    PageAnalyze = () => {
        this.DocumentAnalyze();
        // this.ApiInit();
        // console.log(new Date() - this.timer);
    }
    LocalDataUpdate = (data) => {
        this.models.add({
            model: data,
            id: '$'
        });
        window.$ = this.models.items.$.$;
    }
    //Init local Data
    LocalDataInit = (data) => {
        this.LocalDataUpdate(data);
        this.ModelInit('$');
    }
    api = (id) => {
        return this.apiObject.items.find(api => api.id == id);
    }
    //FIND TAG API FOR GET INFORMATION
    ApiInit = (api) => {
        const conf = {
          url: api.getAttribute('url') ? api.getAttribute('url') : null,
          method: api.getAttribute('method') ? api.getAttribute('method') : 'GET',
          action: api.getAttribute('action') ? api.getAttribute('action') : 'READ',
          data: api.getAttribute('data') ? api.getAttribute('data') : '{}',
          model: api.getAttribute('model') ? api.getAttribute('model') : null,
          id: api.getAttribute('id') ? api.getAttribute('id') : api.getAttribute('model') ? api.getAttribute('model') : null,
          credentials: api.hasAttribute('credentials') ? true : false,
          localStorage: api.hasAttribute('localStorage') ? true : false,
        };

        if (this.api(conf.id)) return;
        
        let loading = {};
        loading[conf.id] = false;
        this.LocalDataUpdate({loading});
        this.apiObject.add(new Ijs_API(conf));
    }
    GetPageNode = () => {
        return this.helps.objects.find(data => data.tagName === 'PAGE');
    }
    AddCatchHref = () => {
        document.addEventListener('click', event => {
            if (this.GetPageNode() && event.target.tagName === 'A' && event.target.getAttribute('href')) {
                const url = event.target.getAttribute('href');
                if (url != location.pathname) {
                    aapi({ url, dataType: 'html' }, (answer) => {
                        let parser = new DOMParser();
                        let doc = parser.parseFromString(answer, "text/html").querySelector('page');
                        if (doc) {
                            this.GetPageNode().rePage(doc);
                            window.history.pushState({},"", url);
                        }
                    });
                }
                event.preventDefault();
            }
        });
    }
    //ANALYZE DOCUMENT to find data path
    DocumentAnalyze = () => {
        for( let i = 0; i < document.querySelectorAll('body')[0].children.length; i++) {
            this.NodeAnalyze({
                node: document.querySelectorAll('body')[0].children[i],
                path: '',
                model: '',
                pref: 0,
                index: 0,
                three_id: 0,
                parent_id: ''
            });
        }
    }
    //ANALYZE NODE
    NodeAnalyze = (conf) => {
        if (conf.node.tagName === 'MODEL') {
            conf.path = `${conf.path}${conf.node.getAttribute('path')}.`;
        }
        if (conf.node.tagName === 'MODEL' && !conf.model) {
            conf.model = conf.node.getAttribute('path');
        }
        if (conf.node.tagName === 'API') {
            this.ApiInit(conf.node);
        } else if (conf.node.tagName === 'IF') {
            this.IfNode(conf);
        } else if (conf.node.tagName === 'FOR') {
            this.ForNode(conf);
        } else if (
            conf.node.tagName === 'ELSEIF'
            || conf.node.tagName === 'ELSE'
            || conf.node.tagName === 'STYLE'
            || conf.node.tagName === 'DATA'
            || conf.node.tagName === 'SCRIPT'
        ) {
            //DO NOTHING
        } else if (conf.node.tagName === 'INPUT' || conf.node.tagName === 'TEXTAREA' || conf.node.tagName === 'SELECT') {
            this.InputNode(conf);
        } else if (conf.node.tagName === 'PAGE') {
            this.PagePlaceInit(conf);
        } else {
            this.ClassicNode(conf);
        }
    }
    PagePlaceInit = (conf) => {
        const obj = new IjsPageDom({
            node: conf.node,
            path: conf.path,
            model: conf.model,
            pref: conf.pref,
            index: conf.index,
            three_id: conf.three_id,
            id: idInit({
                ...conf,
                nodeName: conf.node.tagName,
                i: 0
            }),
            parent_id: conf.parent_id,
        }, this);
        this.AddHelpNode(obj);
        this.ClassicNode({
            ...conf,
            parent_id: obj.id,
            pref: conf.pref + conf.index,
            index: 0,
            three_id: conf.three_id + 1,
        });
    }
    AddClass = (conf) => {
        let paramValue;
        let data = conf.attr.nodeValue; 
        while ((paramValue = this.classPathReg.exec(conf.attr.nodeValue)) != null) {
            data = data.replace(paramValue[0],`${conf.path}${paramValue[1]}`);
        }
        conf.attr.nodeValue = data;
        while ((paramValue = this.numberReg.exec(conf.attr.nodeValue)) != null) {
            data = data.replace(paramValue[0],`[${paramValue[1]}].`);
        }
        
        const obj = new IjsClassDom({
            data,
            parent_id: conf.parent_id,
            node: conf.node,
        });
        this.classes.push(obj);
    }
    ReClass = () => {
        this.classes.forEach(item => {
            item.ReClass();
        });
    }
    AddEvent = (conf) => {
        if (conf.attr.nodeName === 'click') {
            conf.node.addEventListener('click', () => { this.ClickEvent(conf); });
        }
    }
    ClickEvent = ({attr, path}) => {
        let paramFunc, paramValue;
        let data = attr.nodeValue;
        while (( paramValue = this.textContentReg.exec(data)) != null) {
            data = data.replace(paramValue[0], `${path}${paramValue[1]}`);
        }
        let is_set;
        const funcs = data.split(';');
        funcs.forEach(func => {
            is_set = false;
            while (( paramFunc = this.funcReg.exec(func)) != null) {
                if (paramFunc[1] === 'set') {
                    is_set = true;
                    while (( paramValue = this.maksParamsReg.exec(func))!= null) {
                        let params = GetParamsFromString(paramValue[1]);
                        params[0] = `${params[0].substring(0,2) != '$.' ? path : ''}${params[0]}`;
                        this.SetData(...params);
                    }
                }
            }
            if (!is_set) {
                this.GetData(`$f.${func}`);
            }
        });
    }
    
    AnalyzeAttribute = (conf) => {
        if (conf.attr.nodeName === 'click') {
            this.AddEvent(conf);
            return;
        } else if (conf.attr.nodeName === ':class') {
            this.AddClass(conf);
            return;
        }
        let nodeValue;
        let paramValue, paramValueTmp;
        let need_clean = false;
        let new_data = conf.attr.nodeValue;
        
        while ((nodeValue = this.textContentReg.exec(conf.attr.nodeValue)) != null) {
            const model = conf.model ? conf.model : nodeValue[1].trim().split('.')[0];
            let data = nodeValue[1].trim();
            while ((paramValueTmp = this.paramsReg.exec(data)) != null) {
                paramValue = paramValueTmp;
            }
            if (paramValue && data.split('.')[0] !== '$f') {
                data = `$f.${data.replace(
                    paramValue[1],
                    paramValue[1].split(',').map(item => `${conf.path}${item.trim()}`).join(',')
                )}`;
            } else {
                data = `${conf.path}${data}`;
            }
            const obj = {
                node: conf.node,
                model,
                data,
                mask: nodeValue[0],
                input: nodeValue.input,
                attr: conf.attr.nodeName,
                id: idInit({
                    ...conf,
                    nodeName: conf.attr.nodeName,
                }),
                parent_id: conf.parent_id
            };
            this.AddNode(obj);
            need_clean = true;
            new_data = new_data.replace(obj.mask, this.GetData(obj.data));
        }
        if (need_clean && conf.attr.nodeName !== 'textContent') conf.node.setAttribute(conf.attr.nodeName, new_data);
        else if (need_clean) {
            conf.node.textContent = '';
            conf.node.textContent = new_data;
        }
    }
    ForNode = (conf) => {
        for (let i = 0; i < conf.node.attributes.length; i++) {
            if (conf.node.attributes[i].nodeName !== 'items') {
                this.AnalyzeAttribute({
                    ...conf,
                    attr: conf.node.attributes[i],
                    i
                });
            } else if (conf.node.attributes[i].nodeName === 'items') {
                const obj = new IjsForDom({
                    node: conf.node,
                    path: conf.path,
                    model: conf.model,
                    pref: conf.pref,
                    index: conf.index,
                    three_id: conf.three_id,
                    id: idInit({
                        ...conf,
                        nodeName: conf.node.tagName,
                        i
                    }),//`${conf.pref}-${conf.node.tagName}-${conf.three_id}-${conf.index}-${i}`,
                    parent_id: conf.parent_id,
                }, this);
                if (obj.data) this.AddHelpNode(obj);
            }
        }
    } 
    IfNode = (conf) => {
        for (let i = 0; i < conf.node.attributes.length; i++) {
            if (conf.node.attributes[i].nodeName !== 'condition') {
                this.AnalyzeAttribute({
                    ...conf,
                    attr: conf.node.attributes[i],
                    i
                });
            } else if (conf.node.attributes[i].nodeName === 'condition') {
                const obj = new IjsIfDom({
                    node: conf.node,
                    path: conf.path,
                    model: conf.model,
                    pref: conf.pref,
                    index: conf.index,
                    three_id: conf.three_id,
                    id: idInit({
                        ...conf,
                        nodeName: conf.node.tagName,
                        i
                    }),//`${conf.pref}-${conf.node.tagName}-${conf.three_id}-${conf.index}-${i}`,
                    parent_id: conf.parent_id,
                }, this);
                this.AddHelpNode(obj);
            }
        }
    }
    InputNode = (conf) => {
        for (let i = 0; i < conf.node.attributes.length; i++) {
            if (conf.node.attributes[i].nodeName === 'name') {
                let nodeValue, nodeValueTmp;
                while ((nodeValueTmp = this.textContentReg.exec(conf.node.attributes[i].nodeValue)) != null) {
                    nodeValue = nodeValueTmp;
                }
                if (nodeValue) {
                    const model = conf.model ? conf.model : nodeValue[1].trim().split('.')[0];
                    let data = `${conf.path}${nodeValue[1].trim()}`;
                    if (nodeValue[1].trim()) {
                        const obj = new IjsInputDom({
                            node: conf.node,
                            model,
                            mask: nodeValue[0],
                            input: nodeValue.input,
                            data,
                            id: idInit({
                                ...conf,
                                nodeName: 'value',
                                i
                            }),//`${conf.pref}-value-${conf.three_id}-${conf.index}-${i}`,
                            parent_id: conf.parent_id,
                        }, this);
                        this.AddNode(obj);
                    }
                }
            } else if (conf.node.attributes[i].nodeName !== 'value') {
                this.AnalyzeAttribute({
                    ...conf,
                    attr: conf.node.attributes[i],
                    i
                });
            }
        }
    }
    ClassicNode = (conf) => {
        for (let i = 0; i < conf.node.attributes.length; i++) {
            this.AnalyzeAttribute({
                ...conf,
                attr: conf.node.attributes[i],
                i
            });
        }
        if (conf.node.children.length === 0) {
            this.AnalyzeAttribute({
                ...conf,
                attr: {
                    nodeValue: conf.node.textContent,
                    nodeName: 'textContent',
                },
                i: 0
            });
        } else {
            for( let i = 0; i < conf.node.children.length; i++) {
                this.NodeAnalyze({
                    ...conf,
                    node: conf.node.children[i],
                    pref: conf.pref + conf.index,//`${conf.pref}${String.fromCharCode(conf.index)}`,
                    index: i,
                    three_id: conf.three_id + 1,
                });
            }
        }
    }
    AddNode = (obj) => {
        this.data.push(obj);
        let datas, paramValue, paramValueTmp;
        while ((paramValueTmp = this.paramsReg.exec(obj.data)) != null) {
            paramValue = paramValueTmp;
        }
        if (paramValue) {
            datas = paramValue[1].split(',').map(item => item.trim());
        } else {
            datas = [obj.data];
        }
        datas.forEach(data => {
            if (!this.keys[data]) this.keys[data] = [];
            if (this.keys[data].indexOf(obj.id) === -1) this.keys[data].push(obj.id);
        });
    }
    AddIfCondition = (obj) => {
        this.helps.data.push(obj);
        if (!this.helps.keys[obj.data]) this.helps.keys[obj.data] = [];
        if (this.helps.keys[obj.data].indexOf(obj.id) === -1) this.helps.keys[obj.data].push(obj.id);
        if (!this.helps.helpKeys[obj.data]) this.helps.helpKeys[obj.data] = [];
        if (this.helps.helpKeys[obj.data].indexOf(obj.ifId) === -1) this.helps.helpKeys[obj.data].push(obj.ifId);
    }
    AddHelpNode = (obj) => {
        this.helps.objects.push(obj);
        if (obj.data) {
            let datas, paramValue, paramValueTmp;
            while ((paramValueTmp = this.paramsReg.exec(obj.data)) != null) {
                paramValue = paramValueTmp;
            }
            if (paramValue) {
                datas = paramValue[1].split(',').map(item => item.trim());
            } else {
                datas = [obj.data];
            }
            datas.forEach(data => {
                if (!this.helps.helpKeys[data]) this.helps.helpKeys[data] = [];
                if (this.helps.helpKeys[data].indexOf(obj.id) === -1) this.helps.helpKeys[data].push(obj.id);
            });
        }
    }
    UpdateState = (path) => {
        //console.log(path);
        if (this.keys[path]) {
            this.keys[path].forEach(id => this.updateIds[id] = 1);
        }
        if (this.helps.keys[path]) {
            this.helps.keys[path].forEach(id => this.updateConditionIds[id] = 1);
        }
        if (this.helps.helpKeys[path]) {
            this.helps.helpKeys[path].forEach(id => this.updateIfIds[id] = 1);
        }
        
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(() => {
            this.ChangeInit();
            this.updateIds = {};
            this.updateConditionIds = {};
            this.updateIfIds = {};
        },0);
    }
    ChangeInit = () => {
        let reInit = true;
        while (reInit) {
            const uniqueConditionIds = Object.keys(this.updateConditionIds);
            const uniqueIfIds = Object.keys(this.updateIfIds);
            this.DataInit(uniqueConditionIds, this.helps.data);
            reInit = this.HelpInit(uniqueIfIds, this.helps.objects);
        }

        const uniqueIds = Object.keys(this.updateIds);
        this.DataInit(uniqueIds, this.data);

        this.ReClass();
    }
    ModelInit = (model) => {
        let reInit = true;
        while (reInit) {
            const uniqueConditionIds = this.GetUniqueIds(model, this.helps.data, 'id');
            const uniqueIfIds = this.GetUniqueIds(model, this.helps.data, 'ifId');
            const uniqueHelpIds = this.GetUniqueIds(model, this.helps.objects, 'id');
            this.DataInit(uniqueConditionIds, this.helps.data);
            reInit = this.HelpInit(uniqueIfIds, this.helps.objects);
            if (this.HelpInit(uniqueHelpIds, this.helps.objects)) reInit = true;
        }
        const uniqueIds = this.GetUniqueIds(model, this.data, 'id');
        this.DataInit(uniqueIds, this.data);
        this.ReClass();

        // this.updateIds = {};
        // this.updateConditionIds = {};
        // this.updateIfIds = {};
        // console.log(new Date() - this.timer);
    }
    GetUniqueIds = (model, data, id) => {
        const allItems = data.filter(item => item.model === model);
        let uniqueIds = [];

        allItems.forEach(item => {
            if (uniqueIds.indexOf(item[id]) === -1) {
                uniqueIds.push(item[id]);
            }
        });

        return uniqueIds;
    }
    HelpInit = (uniqueIds, data) => {
        let result = false;
        uniqueIds.forEach(id => {
            data.filter(item => item.id === id)
                .forEach(item => {
                    if (item.ReInit()) {
                        result = true;
                    }
                });
        });
        return result;
    }
    DataInit = (uniqueIds, data) => {
        let results = {};

        uniqueIds.forEach(id => {
            const items = data.filter(item => item.id === id);
            items.forEach(item => {
                const result = this.GetData(item.data, item.attr === 'condition');
                if ( !results[item.id] ) {
                    results[item.id] = {
                        node: item.node,
                        text: item.input,
                        attr: item.attr,
                    };
                }
                results[item.id].text = results[item.id].text
                    .replace(item.mask, result);
            });
        });
        for (const i in results) {
            if(results[i].attr === 'textContent') {
                results[i].node.innerHTML = '';
                results[i].node.append(results[i].text);
            } else {
                if (results[i].attr == 'value' && results[i].node.tagName == 'SELECT') {
                    results[i].node.value = results[i].text;
                } else if (results[i].attr == 'value' && (results[i].node.tagName == 'INPUT' || results[i].node.tagName == 'TEXTAREA')) {
                    results[i].node.value = results[i].text;
                } else if (results[i].attr == 'checked' && results[i].node.tagName == 'INPUT') {
                    results[i].node.checked = JSON.parse(results[i].text);
                } else if (results[i].attr == 'radio' && results[i].node.tagName == 'INPUT') {
                    if (results[i].node.value == results[i].text) {
                        results[i].node.checked = true;
                    }
                } else {
                    results[i].node.setAttribute(results[i].attr, results[i].text);
                }
            }
        }
    }
    ModifyPathName = (name) => {
        const path = name.trim().split('.');
        if (path[0] === '$d' || path[0] === '$f') {
            return name
                .replace('$d', `items.${path[1]}`)
                .replace('$f', 'functions');
        } else {
            return `items.${path[0]}.${name}`;
        }
    }
    GetFuncData = (model, params) => {
        if (!params) return model();

        params = GetParamsFromString(params).map(param => {
            return this.GetData(param);
        });
        return model(...params);
    }
    GetData = (name, not_null = false) => {
        let paramValue, helpParamValue;
        while ((helpParamValue = this.maksParamsReg.exec(name)) != null) {
            paramValue = helpParamValue;
            name = name.replace(paramValue[0],'');
        }

        const path = this.ModifyPathName(name).trim().split('.');
        let model = this.models;
        for (var i in path) {
            if (path[i] == '*')
                return model;
            if (isFinite(model))
                return parseFloat(model);
            if (model == path[i])
                return true;
            else if (model[path[i]] || model[path[i]] == 0) {
                model = model[path[i]];
                if (typeof model == 'function') {
                    model = this.GetFuncData(model, paramValue ? paramValue[1] : '')
                }
            } else 
                return model[path[i]];
        }
        if (!not_null) return model;
        else if (!model) return null;
        else if (typeof model === 'object') return true;
        else if (typeof model === 'string') return `'${model}'`;
        return model;
    }
    SetData = (name, data) => {
        let model = this.models;
        const path = this.ModifyPathName(name).trim().split('.');
        for (var i in path) {
          if (model[path[i]] && i < path.length - 1 ) {
            model = model[path[i]];
          } else if (path.length - 1 == i) {
            model[path[i]] = data;
          } else {
            return false;
          }
        }
    }

    CleanKeys = (id) => {
        //classses
        this.classes = this.classes.filter(item => item.parent_id !== id);
        //data
        let ids = this.data.filter(item => item.parent_id === id).map(item => item.id);
        this.data = this.data.filter(item => item.parent_id !== id);
        for (const i in this.keys) {
            this.keys[i] = this.keys[i].filter(item => ids.indexOf(item) === -1);
        }
        //condition
        ids = this.helps.data.filter(item => item.parent_id === id).map(item => item.id);
        this.helps.data = this.helps.data.filter(item => item.parent_id !== id);
        for (const i in this.helps.keys) {
            this.helps.keys[i] = this.helps.keys[i].filter(item => ids.indexOf(item) === -1);
        }
        //ifs
        ids = this.helps.objects.filter(item => item.parent_id === id).map(item => item.id);
        this.helps.objects = this.helps.objects.filter(item => item.parent_id !== id);
        for (const i in this.helps.helpKeys) {
            this.helps.helpKeys[i] = this.helps.helpKeys[i].filter(item => ids.indexOf(item) === -1);
        }
        ids.forEach(id => {
            this.CleanKeys(id);
        });
    }
  };
  
  class Ijs_Array {
    constructor () {
      this.items = [];
    }
    add = (model) => {
      const findIndex = this.items.findIndex(item => item.id === model.id);
      if (findIndex === -1) {
        this.items.push(model);
        model.init();
      } else {
        console.error(`Duplicate api model ${model.id}`);
        this.update(findIndex, model);
      }
    }
    update = (model) => {
      //TO DO
    }
  }

  class Ijs_Object {
    constructor () {
      this.items = {};
      this.functions = {};
    }
    add = ({ model, id }) => {
        const tmp = {};
        tmp[id] = model;
        if (!this.items[id]) {
            this.items[id] = InitData(tmp);
        } else {

            this.items[id] = InitData(ObjectAssign(ObjectAssign({},this.items[id]), tmp));
        }
    }
    addFunctions = (funcs) => {
        this.functions = ObjectAssign(this.functions, funcs);
    }
  }
  function ObjectAssign(originObj, newObj) {
    for (let i in newObj) {
        if (i != '__data') {
            if (Array.isArray(newObj[i])) {
                originObj[i] = [];
                newObj[i].forEach(obj => {
                    originObj[i].push(ObjectAssign({}, obj));
                });
            } else if (
                newObj[i] !== null
                && typeof newObj[i] === 'object'
                && typeof originObj[i] === 'object'
            ) {
                originObj[i] = ObjectAssign(originObj[i], newObj[i]);
            } else if (newObj[i] !== null && typeof newObj[i] === 'object') {
                originObj[i] = ObjectAssign({}, newObj[i]);
            } else {
                originObj[i] = newObj[i];
            }
        }
    }
    return originObj;
  }
  
  class Ijs_API {
    constructor (api) {
        this.url = api.url;
        this.method = api.method;
        this.action = api.action;
        this.model = api.model;
        this.id = api.id;
        this.localStorage = api.localStorage;
        this.load = false;
        let json;
        eval(`json = ${api.data};`);
        this.data = json;
        if (this.localStorage) {
            const model = JSON.parse(localStorage.getItem(this.id) ? localStorage.getItem(this.id) : 'null');
            if (model) {
                setTimeout(() => {
                    this.dataInit({
                        model,
                        id: this.id
                    });
                },0);
            }
        }
    }
    changeData = (data) => {
        this.data = ObjectAssign(this.data, data);
        return this;
    }
    send = () => {
        window.ijs.SetData(`$.loading.${this.id}`, false);
        this.init();
        return this;
    }
    init = () => {
        aapi({
            url: this.url,
            method: this.method,
            data: this.data,
        }, this.onload, this.onerror);
    }
    onload = (response) => {
        this.load = true;
        window.ijs.SetData(`$.loading.${this.id}`, true);
        let model = null;
        if (this.model && this.model !== '*') {
            model = response && response[this.model] ? response[this.model] : null;
        } else {
            model = response;
        }
        if (model) {
            if (this.localStorage) {
                localStorage.setItem(this.id, JSON.stringify(model));
            }
            this.dataInit({
                model,
                id: this.id
            });
        }
    }
    dataInit({model, id}) {
        window.ijs.models.add({
            model,
            id
        });
        window[id] = window.ijs.models.items[id][id];
        window.ijs.ModelInit(id);
    }
    onerror = (status, response) => {
      console.error(`Errror: ${status} ${response}`);
    }
  }

function aapi(api, callback = null, callbackError = null) {
    this.url = api.url;
    this.data = api.data;
    this.method = api.method ? api.method : 'GET';
    let xhr = new XMLHttpRequest();
    if (this.method !== 'GET') {
        xhr.open(this.method, this.url);
    } else {
        let p = '';
        for (i in this.data) {
            p = p ? `${p}&` : p;
            p = `${p}${i}=${encodeURI(this.data[i])}`;
        }
        xhr.open(this.method, `${this.url}?${p}`);
    }
    if (!api.dataType || api.dataType != 'html')
        xhr.responseType = api.dataType ? api.dataType : 'json';
    if (this.credentials) xhr.withCredentials = true;
    xhr.send(JSON.stringify(this.data));
    xhr.onload = function() {
        if (callback) callback(xhr.response);
    };
    xhr.onerror = function() {
        if (callbackError) callbackError(xhr.status, xhr.response);
    };
    xhr.onprogress = function(event) { // запускается периодически
        // event.loaded - количество загруженных байт
        // event.lengthComputable = равно true, если сервер присылает заголовок Content-Length
        // event.total - количество байт всего (только если lengthComputable равно true)
        // console.log(`Загружено ${event.loaded} из ${event.total}`);
    };
}
  
function getArrayHandler(path) {
    return {
        get: function(target, property) {
            if (property == 'isProxy')
                return true;
            return target[property];
        },
        set: function(target, property, value, receiver) {
            if(property == 'length') {
                window.ijs.UpdateState(`${path}.${property}`);
                window.ijs.UpdateState(path);
            } else if (typeof value == 'object') {
                const keys = Object.keys(value);
                value = InitData(value,`${path}.${property}`);
                target[property] = value;
                for(key in keys) {
                    window.ijs.UpdateState(`${path}.${property}.${keys[key]}`);
                }
            } else {
                target[property] = value;
                window.ijs.UpdateState(`${path}.${property}`);
            }
            
            return true;
        }
    };
}
function InitData(init_data, path = '') {
    const data = init_data;
    init_data = {
        __data: {}
    };
    
    const keys = Object.keys(data);
    for(k in keys) {
        const param = keys[k];
        init_data.__data[param] = data[param];
        (function(field_name) {
            Object.defineProperty (init_data, field_name, {
                enumerable: true,
                // configurable: true,
                get: function () { 
                    return init_data.__data[field_name];
                },
                set: function (new_value) {
                    if (Array.isArray(init_data.__data[field_name])) {
                        init_data.__data[field_name] = new Proxy( new_value, getArrayHandler(path ? `${path}.${field_name}` : field_name) );
                    } else {
                        init_data.__data[field_name] = new_value;
                    }
                    window.ijs.UpdateState(path ? `${path}.${field_name}` : field_name);
                }
            });
        })(param);
        if (Array.isArray(data[param])) {
            for( let key in data[param]) {
                if (typeof data[param][key] == 'object') {
                    data[param][key] = InitData(data[param][key], path ? `${path}.${param}.${key}` : `${param}.${key}`);
                }
            }
            init_data.__length = data[param].length;
            init_data.__data[param] = new Proxy( data[param], getArrayHandler(path ? `${path}.${param}` : param) );
        } else if (typeof data[param] == 'object' && data[param]) {
            init_data.__data[param] = InitData(init_data.__data[param], path ? `${path}.${param}` : param);
        }
    }
    return init_data;
}

function IjsInputDom(conf, self) {
    this.redata = 0;
    this.node = conf.node;
    this.model = conf.model;
    this.mask = conf.mask ? conf.mask : null;
    this.data = conf.data ? conf.data : null;
    this.input = conf.input ? conf.input : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.id = conf.id;
    this.timerId = null;
    this.self = self;
    
    this.Change = this.Change.bind(this);
    this.Radio = this.Radio.bind(this);
    this.Checked = this.Checked.bind(this);

    let type = this.node.getAttribute('type');
    if (type) {
      type = type.trim().toLowerCase();
    }
    if (this.node.tagName === 'SELECT') {
        this.attr = 'value';
        this.node.addEventListener('change', this.Change);
        this.node.value = this.self.GetData(this.data);
    } else if (this.node.tagName === 'TEXTAREA') {
        this.attr = 'value';
        this.node.addEventListener('keyup', this.Change);
        this.node.value = this.self.GetData(this.data);
    } else if (type == 'checkbox') {
        this.attr = 'checked';
        this.node.addEventListener('change', this.Checked);
        this.node.checked = JSON.parse(this.self.GetData(this.data));
    }else if (type == 'radio') {
        this.attr = 'radio';
        this.node.addEventListener('change', this.Radio);
        if (this.node.value == this.self.GetData(this.data)) {
            this.node.checked = true;
        }
    } else {
        this.attr = 'value';
        this.node.addEventListener('keyup', this.Change);
        this.node.value = this.self.GetData(this.data);
    }
}
IjsInputDom.prototype.Checked = function(e) {
    const _this = this;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      _this.self.SetData(_this.data, e.target.checked);
    },1);
  }
IjsInputDom.prototype.Radio = function(e) {
    const _this = this;
    if (e.target.checked) {
      clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        _this.self.SetData(_this.data, e.target.value);
      },1);
    }
  }
IjsInputDom.prototype.Change = function(e) {
    const _this = this;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      _this.self.SetData(_this.data, e.target.value);
    },100);
}

function IjsClassDom(conf) {
    this.data = conf.data;
    this.parent_id = conf.parent_id;
    this.node = conf.node;
    this.ReClass();
}
IjsClassDom.prototype.ReClass = function() {
    const item = this;
    setTimeout(() => {
        let json;
        eval(`json = ${item.data};`);
        for (const className in json) {
            if (!json[className]) item.node.classList.remove(className);
            else item.node.classList.add(className);
        }
    },1);
}

function IjsForDom(conf, self) {
    this.data = null;
    this.model = conf.model ? conf.model : '';
    this.path = conf.path ? conf.path : '';
    this.node = conf.node ? conf.node : null;
    this.id = conf.id ? conf.id : null;
    this.pref = conf.pref ? conf.pref : null;
    this.index = conf.index ? conf.index : 0;
    this.three_id = conf.three_id ? conf.three_id : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.self = self;
    this.textContentReg = /{([\s\S]*?)}/gm;
    this.paramsReg = /\(([\s\S]*?)\)/gm;
    this.helpNode = document.createElement('DIV');
    this.nodes = [];
    for( let i = 0; i < this.node.children.length; i++) {
        this.nodes.push(this.node.children[i].cloneNode(true));
    }
    this.node.innerHTML = '';

    let nodeValue, nodeValueTmp, paramValue, paramValueTmp;
    while ((nodeValueTmp = this.textContentReg.exec(this.node.getAttribute('items'))) != null) {
        nodeValue = nodeValueTmp;
    }
    if (nodeValue) {
        this.model = this.model ? this.model : nodeValue[1].trim().split('.')[0];
        this.data = nodeValue[1].trim();
        while ((paramValueTmp = this.paramsReg.exec(this.data)) != null) {
            paramValue = paramValueTmp;
        }
        if (paramValue && this.data.split('.')[0] !== '$f') {
            this.data = `$f.${this.data.replace(
                paramValue[1],
                paramValue[1].split(',').map(item => `${this.path}${item.trim()}`).join(',')
            )}`;
        } else {
            this.data = `${this.path}${this.data}`;
        }
        this.ReInit();
    }
}
IjsForDom.prototype.ReInit = function() {
    const items = this.self.GetData(this.data);
    if (!items) {
        console.error(`${this.data} not find`);
        return;
    } else if (!Array.isArray(items)) {
        console.error(`${this.data} not array`);
        return;
    }
    this.node.innerHTML = '';
    items.forEach((item, key) => {
        this.nodes.forEach(node => {
            this.helpNode.append(node.cloneNode(true));
        });
        this.self.NodeAnalyze({
            node: this.helpNode,
            path: `${this.data}.${key}.`,
            model: this.model,
            pref: this.pref + this.index,//`${this.pref}${String.fromCharCode(this.index)}`,
            index: key,
            three_id: this.three_id + 1,
            parent_id: this.id
        });
        while (this.helpNode.children.length > 0) {
            this.node.append(this.helpNode.children[0]);
        }
    });
}

function IjsPageDom(conf, self) {
    this.model = conf.model;
    this.node = conf.node;
    this.tagName = conf.node.tagName;
    this.path = conf.path;
    this.id = conf.id ? conf.id : null;
    this.pref = conf.pref ? conf.pref : null;
    this.index = conf.index ? conf.index : null;
    this.three_id = conf.three_id ? conf.three_id : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.self = self;
    this.helpNode = document.createElement('DIV');
}
IjsPageDom.prototype.rePage = function(page) {
    this.node.innerHTML = '';
    const parent_id = this.id;
    this.self.CleanKeys(parent_id);
    this.helpNode.innerHTML = '';
    page.querySelectorAll('script').forEach(script => {
        if (!script.hasAttribute('src')) {
            eval(script.innerHTML);
        } else {
            aapi({ url: script.getAttribute('src'), dataType: 'html' }, (answer) => {
                eval(answer);
            });
        }
    });
    for( let i = 0; i < page.children.length; i++) {
        this.helpNode.append(page.children[i]);
    }
    this.self.NodeAnalyze({
        node: this.helpNode,
        path: this.path,
        model: this.model,
        pref: this.pref + this.index,
        index: 0,
        three_id: this.three_id + 1,
        parent_id: this.id
    });
    for( let i = this.helpNode.children.length - 1; i >= 0; i--) {
        this.node.prepend(this.helpNode.children[i]);
    }
}

function IjsIfDom(conf, self) {
    this.model = conf.model;
    this.path = conf.path;
    this.id = conf.id ? conf.id : null;
    this.pref = conf.pref ? conf.pref : null;
    this.index = conf.index ? conf.index : null;
    this.three_id = conf.three_id ? conf.three_id : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.self = self;
    this.textContentReg = /{([\s\S]*?)}/gm;
    this.paramsReg = /\(([\s\S]*?)\)/gm;
    this.nodes = [];
    this.helpNode = document.createElement('DIV');

    let node = conf.node;
    let key = 0;
    while (node) {
        const obj = this.InitNode(node, key);
        key++;
        this.nodes.push(obj);
        if (node.tagName !== 'ELSE') node = this.NextNode(node);
        else node = null;
    }
    this.ReInit();
}
IjsIfDom.prototype.ReInit = function() {
    const old_object = this.nodes.find(object => object.init);
    const object = this.nodes.find(object => {
        // console.log(object.node.getAttribute('condition'));
        return eval(object.node.getAttribute('condition'));
    });
    if ((!object || !object.init) && old_object) {
        old_object.node.innerHTML = '';
        old_object.init = false;
        this.self.CleanKeys(this.id);
    }
    if (!object) return false;
    if (!object.init) {
        object.nodes.forEach(node => {
            this.helpNode.append(node.cloneNode(true));
        });
        this.self.NodeAnalyze({
            node: this.helpNode,
            path: this.path,
            model: this.model,
            pref: this.pref + this.index,//`${this.pref}${String.fromCharCode(this.index)}`,
            index: 0,
            three_id: this.three_id + 1,
            parent_id: this.id
        });
        for( let i = this.helpNode.children.length - 1; i >= 0; i--) {
            object.node.prepend(this.helpNode.children[i]);
        }
        object.init = true;
        return true;
    }
    return false;
    
}
IjsIfDom.prototype.NextNode = function(node) {
    const nextNode = node.nextElementSibling;
    if (!nextNode) return null;
    if (nextNode.tagName !== 'ELSEIF' && nextNode.tagName !== 'ELSE') return null;
    return nextNode;
}
IjsIfDom.prototype.InitNode = function(node, key) {
    let nodeValue;
    let need_clean = false;
    const attr = node.getAttribute('condition') ? {
        nodeValue: node.getAttribute('condition'),
        nodeName: 'condition',
    } : {
        nodeValue: '1 === 1',
        nodeName: 'condition',
    };
    if (!node.getAttribute('condition')) node.setAttribute('condition', '1 === 1');
    let new_data = attr.nodeValue;
    while ((nodeValue = this.textContentReg.exec(attr.nodeValue)) != null) {
        const model = this.model ? this.model : nodeValue[1].trim().split('.')[0];
        let data = `${this.path}${nodeValue[1].trim()}`;
        let paramValue, paramValueTmp;
        while ((paramValueTmp = this.paramsReg.exec(data)) != null) {
            paramValue = paramValueTmp;
        }
        if (paramValue && data.split('.')[0] !== '$f') {
            data = `$f.${data.replace(
                paramValue[1],
                paramValue[1].split(',').map(item => `${this.path}${item.trim()}`).join(',')
            )}`;
        }
        const obj = {
            node,
            model,
            mask: nodeValue[0],
            input: nodeValue.input,
            data,
            attr: attr.nodeName,
            id: `${this.id}-${attr.nodeName}-${key}`,
            ifId: this.id,
            parent_id: this.parent_id,
        };
        this.self.AddIfCondition(obj);
        need_clean = true;
        new_data = new_data.replace(obj.mask, this.self.GetData(obj.data, true));
    }
    if (need_clean) {
        node.setAttribute(attr.nodeName, new_data);
    }
    const obj = {
        init: false,
        tagName: node.tagName,
        node,
        nodes: [],
    };
    for( let i = 0; i < node.children.length; i++) {
        obj.nodes.push(node.children[i].cloneNode(true));
    }
    node.innerHTML = '';
    return obj;
}
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}
function idInit(conf) {
    return `${conf.pref}${conf.nodeName[0]}${conf.three_id}${conf.index}${conf.i}`;
}
function GetParamsFromString(str) {
    let brackets = 0;
    let splits = [];
    let lastSplit = 0;
    for (let i=0; i < str.length; i++) {
        if (str[i] === ',' && brackets == 0) {
            splits.push(str.substring(lastSplit, i).trim());
            lastSplit = i + 1;
        } else if (str[i] === '(') {
            brackets++;
        } else if (str[i] === ')') {
            brackets--;
        }
    }
    if (lastSplit != str.length) {
        splits.push(str.substr(lastSplit, str.length).trim());
    }
    return splits;
}
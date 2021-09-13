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
function Ijs() {
    window.state = {};
    this.textContentReg = new RegExp("{([\s\S]*?)}",'gm');// /{([\s\S]*?)}/gm;
    this.numberReg = new RegExp("\.([0-9]*?)\.",'gm');// /\.([0-9]*?)\./gm;
    this.classPathReg = new RegExp("{{([\s\S]*?)}}",'gm');// /{{([\s\S]*?)}}/gm;
    this.paramsReg = new RegExp("\(([\s\S][^(]*?)\)",'gm');// /\(([\s\S][^(]*?)\)/gm;
    this.maksParamsReg = new RegExp("\((.*)\)",'gm');// /\((.*)\)/gm;
    this.maksKeysReg = new RegExp("\[(.*)\]",'gm');// /\[(.*)\]/gm;
    this.funcReg = new RegExp("^([\s\S]*?)\(",'gm');// /^([\s\S]*?)\(/gm;

    this.apis = {
        objects: [],
        keys: {},
    };
    this.events = [];
    this.classes = [];
    this.events = [];
    this.data = [];
    this.keys = {};
    this.paths = {};

    this.helps = {
        data: [],
        keys: {},
        helpKeys: {},
        objects: []
    };
    this.models = new Ijs_Object();
    this.updateTimer = null;
    this.modelTimer = null;
    this.updateIds = {};
    this.updateConditionIds = {};
    this.updateIfIds = {};
    this.updateApiIds = {};
    this.tmp = {};
    this.LocalDataInit({
        loading: {},
    });
    this.models.add({
        model: true,
        id: '$page'
    });
    this.models.add({
        model: {},
        id: '$event'
    });
    // this.models.addFunctions({set: this.SetData});
    // window.state.$f = this.models.functions;
    this.Run();
    for( let i = 0; i < document.querySelectorAll('loading').length; i++) {
        document.querySelectorAll('loading')[i].remove();
    }
}
Ijs.prototype.ConfInit = function(conf) {
    if (conf.methods) this.models.addFunctions(conf.methods);
    if (conf.watch) this.models.addWatch(conf.watch);
    window.state.$f = this.models.functions;
    if (conf.data) this.LocalDataInit(conf.data);
    this.ModelInit('*');
    if (this.models.functions.onload) {
        this.models.functions.onload();
        this.models.functions.onload = null;
    }
}

//INIT APLICATION
Ijs.prototype.Run = function() {
    this.PageAnalyze();
    this.AddCatchHref();
    let _this = this;
    window.onpopstate = function(event) {
        aapi({ url: document.location, dataType: 'html' }, (answer) => {
            let parser = new DOMParser();
            let doc = parser.parseFromString(answer, "text/html").querySelector('page');
            if (doc) {
                _this.GetPageNode().rePage(doc);
            }
        });
    }
}
//INIT:)
Ijs.prototype.PageAnalyze = function() {
    this.DocumentAnalyze();
    // this.ApiInit();
    // console.log(new Date() - this.timer);
}
Ijs.prototype.LocalDataUpdate = function(data) {
    this.models.add({
        model: data,
        id: '$'
    });
    window.state.$ = this.models.items.$.$;
}
//Init local Data
Ijs.prototype.LocalDataInit = function(data) {
    this.LocalDataUpdate(data);
    this.ModelInit('$');
}
Ijs.prototype.api = function(id) {
    return this.apis.objects.find(api => api.id == id);
}
//FIND TAG API FOR GET INFORMATION
Ijs.prototype.ApiInit = function(pconf) {
    const api = pconf.node;
    const conf = {
        url: api.getAttribute('url') ? api.getAttribute('url') : null,
        method: api.getAttribute('method') ? api.getAttribute('method') : 'GET',
        action: api.getAttribute('action') ? api.getAttribute('action').toUpperCase() : 'READ',
        data: api.getAttribute('data') ? api.getAttribute('data') : '{}',
        model: api.getAttribute('model') ? api.getAttribute('model') : null,
        id: api.getAttribute('id') ? api.getAttribute('id') : api.getAttribute('model') ? api.getAttribute('model') : null,
        credentials: api.hasAttribute('credentials') ? true : false,
        localStorage: api.hasAttribute('localStorage') ? true : false,
        parent_id: pconf.parent_id,
        path: pconf.path,
        node: api,
    };
    const url = this.AnalyzeAttribute(object_join(
        pconf,
        {
            id: conf.id,
            attr: {
                nodeName: 'url',
                nodeValue: api.getAttribute('url')
            },
            i: 0
        }), true);
    if (url) conf.url = url;

    if (this.api(conf.id)) {
        this.api(conf.id).active = true;
        this.api(conf.id).node = api;
        this.api(conf.id).reConf(conf);
        return;
    }
    let loading = {};
    loading[conf.id] = false;
    this.LocalDataUpdate({loading});
    const obj = new Ijs_API(conf, this);
    this.apis.objects.push(obj);
}
Ijs.prototype.GetPageNode = function() {
    return this.helps.objects.find(data => data.tagName === 'PAGE');
}
Ijs.prototype.AddCatchHref = function() {
    document.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey) return;
        const a = event.target.closest('a');
        if (
            a
            && (!a.getAttribute('target') || a.getAttribute('target') != '_blank')
            && a.getAttribute('href')
            && !a.hasAttribute('reopen')
            && this.GetPageNode()) {
            const url = a.getAttribute('href');
            if (url != location.pathname) {
                this.page(url, event);
            }
            event.preventDefault();
        }
    });
}
Ijs.prototype.page = function(url, event = false) {
    if (!this.GetPageNode()) {
        location = url;
    }
    window.ijs.SetData('$page', false);
    aapi({ url, dataType: 'html' }, (answer) => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(answer, "text/html").querySelector('page');
        if (doc) {
            window.scrollTo(0,0);
            this.GetPageNode().rePage(doc);
            window.history.pushState({},"", url);
        } else {
            location = url;
        }
        window.ijs.SetData('$page', true);
    }, () => {
        location = url;
    });
}
//ANALYZE DOCUMENT to find data path
Ijs.prototype.DocumentAnalyze = function() {
    // for( let i = 0; i < document.querySelectorAll('body')[0].children.length; i++) {
    //     this.NodeAnalyze({
    //         node: document.querySelectorAll('body')[0].children[i],
    //         path: '',
    //         model: '',
    //         pref: 0,
    //         index: i,
    //         three_id: 0,
    //         parent_id: ''
    //     });
    // }
    this.NodeAnalyze({
        node: document.querySelectorAll('body')[0],
        path: '',
        model: '',
        pref: 0,
        index: 0,
        three_id: 0,
        parent_id: ''
    });
}
//ANALYZE NODE
Ijs.prototype.NodeAnalyze = function(conf) {
    if (conf.node.tagName === 'MODEL') {
        conf.path = `${conf.path}${conf.node.getAttribute('path')}.`;
    }
    if (conf.node.tagName === 'MODEL' && !conf.model) {
        conf.model = conf.node.getAttribute('path').split('.')[0];
    }
    if (conf.node.tagName === 'API') {
        this.ApiInit(conf);
    } else if (conf.node.tagName === 'IF') {
        this.IfNode(conf);
    } else if (conf.node.tagName === 'FOR') {
        this.ForNode(conf);
    } else if (conf.node.tagName === 'PAGE') {
        this.PagePlaceInit(conf);
    } else if (
        conf.node.tagName === 'ELSEIF'
        || conf.node.tagName === 'ELSE'
        || conf.node.tagName === 'STYLE'
        || conf.node.tagName === 'DATA'
        || conf.node.tagName === 'SCRIPT'
        || conf.node.tagName === 'CODE'
        || conf.node.tagName === 'NOINDEX'
    ) {
        //DO NOTHING
    } else if (conf.node.tagName === 'INPUT' || conf.node.tagName === 'TEXTAREA') {
        this.InputNode(conf);
    } else if (conf.node.tagName === 'SELECT') {
        this.ForNode(conf);
        this.InputNode(conf);
    } else {
        this.ClassicNode(conf);
    }
}
Ijs.prototype.PagePlaceInit = function(conf) {
    const obj = new IjsPageDom({
        node: conf.node,
        path: conf.path,
        model: conf.model,
        pref: conf.pref,
        index: conf.index,
        three_id: conf.three_id,
        id: idInit(object_join(
            conf,
            {
                nodeName: conf.node.tagName,
                i: 0
            })),
        parent_id: conf.parent_id,
    }, this);
    this.AddHelpNode(obj);
    this.ClassicNode(object_join(
        conf, {
        parent_id: obj.id,
        pref: conf.pref + conf.index,
        index: 0,
        three_id: conf.three_id + 1,
    }));
}
Ijs.prototype.AddClass = function(conf) {
    let paramValue;
    let data = conf.attr.nodeValue; 
    while ((paramValue = this.classPathReg.exec(conf.attr.nodeValue)) != null) {
        data = data.replace(paramValue[0],this.RePref({
            data: paramValue[1],
            pref: conf.path
        }));
    }
    conf.attr.nodeValue = data;
    while ((paramValue = this.numberReg.exec(conf.attr.nodeValue)) != null) {
        data = data.replace(paramValue[0],`[${paramValue[1]}].`);
    }
    data = data.split('$f').join('state.$f').split('.*').join('');
    const obj = new IjsClassDom({
        data,
        parent_id: conf.parent_id,
        node: conf.node,
    });
    this.classes.push(obj);
}
Ijs.prototype.ReClass = function() {
    this.classes.forEach(item => {
        item.ReClass();
    });
}

Ijs.prototype.AnalyzeAttribute = function(conf, isApi = false) {
    if (
        conf.attr.nodeName === 'click'
        || conf.attr.nodeName === 'thisclick'
        || conf.attr.nodeName === 'hover'
        || conf.attr.nodeName === 'keyup'
        || conf.attr.nodeName === 'change'
        || conf.attr.nodeName === 'focus'
        || conf.attr.nodeName === 'blur'
        || conf.attr.nodeName === 'enter'
    ) {
        this.events.push(new IjsEventDom(conf, this));
        return;
    } else if (conf.attr.nodeName === ':class') {
        this.AddClass(conf);
        return;
    }
    let nodeValue;
    // let paramValue, paramValueTmp;
    let need_clean = false;
    let new_data = conf.attr.nodeValue;
    
    while ((nodeValue = this.textContentReg.exec(conf.attr.nodeValue)) != null) {
        const model = conf.model ? conf.model : nodeValue[1].trim().split('.')[0];
        const models = this.GetModels({pref: conf.path, data: nodeValue[1]});
        let data = nodeValue[1].trim();
        const obj = {
            node: conf.node,
            path: conf.path,
            model,
            models,
            data,
            mask: nodeValue[0],
            input: nodeValue.input,
            attr: conf.attr.nodeName,
            id: isApi && conf.id ? conf.id : idInit(object_join(
                conf, {
                nodeName: conf.attr.nodeName,
            })),
            parent_id: conf.parent_id
        };
        this.AddNode(obj, isApi);
        need_clean = true;
        new_data = new_data.replace(obj.mask, this.GetData({ name: obj.data, pref: obj.path }));
    }
    if (need_clean && conf.attr.nodeName !== 'textContent') conf.node.setAttribute(conf.attr.nodeName, new_data);
    else if (need_clean) {
        conf.node.textContent = '';
        conf.node.innerHTML = new_data;
    }
    return new_data || null;
}
Ijs.prototype.ForNode = function(conf) {
    for (let i = 0; i < conf.node.attributes.length; i++) {
        if (conf.node.attributes[i].nodeName !== 'items') {
            // this.AnalyzeAttribute({
            //     ...conf,
            //     attr: conf.node.attributes[i],
            //     i
            // });
        } else if (conf.node.attributes[i].nodeName === 'items') {
            const obj = new IjsForDom({
                node: conf.node,
                path: conf.path,
                model: conf.model,
                pref: conf.pref,
                index: conf.index,
                three_id: conf.three_id,
                id: idInit(object_join(
                    conf, {
                    nodeName: conf.node.tagName,
                    i
                })),//`${conf.pref}-${conf.node.tagName}-${conf.three_id}-${conf.index}-${i}`,
                parent_id: conf.parent_id,
            }, this);
            if (obj.data) this.AddHelpNode(obj);
        }
    }
} 
Ijs.prototype.IfNode = function(conf) {
    for (let i = 0; i < conf.node.attributes.length; i++) {
        if (conf.node.attributes[i].nodeName !== 'condition') {
            this.AnalyzeAttribute(object_join(
                conf, {
                attr: conf.node.attributes[i],
                i
            }));
        } else if (conf.node.attributes[i].nodeName === 'condition') {
            const obj = new IjsIfDom({
                node: conf.node,
                path: conf.path,
                model: conf.model,
                pref: conf.pref,
                index: conf.index,
                three_id: conf.three_id,
                id: idInit(object_join(
                    conf, {
                    nodeName: conf.node.tagName,
                    i
                })),//`${conf.pref}-${conf.node.tagName}-${conf.three_id}-${conf.index}-${i}`,
                parent_id: conf.parent_id,
            }, this);
            this.AddHelpNode(obj);
        }
    }
}
Ijs.prototype.InputNode = function(conf) {
    if (conf.node.getAttribute('value') && conf.node.getAttribute('type') && conf.node.getAttribute('type').toLowerCase() == 'radio') {
        this.AnalyzeAttribute(object_join(
            conf, {
            attr: {
                nodeName: 'value',
                nodeValue: conf.node.getAttribute('value')
            },
            i: 28
        }));
    }
    for (let i = 0; i < conf.node.attributes.length; i++) {
        if (conf.node.attributes[i].nodeName === 'name') {
            let nodeValue, nodeValueTmp;
            while ((nodeValueTmp = this.textContentReg.exec(conf.node.attributes[i].nodeValue)) != null) {
                nodeValue = nodeValueTmp;
            }
            if (nodeValue) {
                const model = conf.model ? conf.model : nodeValue[1].trim().split('.')[0];
                let data = nodeValue[1].trim();
                if (nodeValue[1].trim()) {
                    const obj = new IjsInputDom({
                        node: conf.node,
                        model,
                        path: conf.path,
                        mask: nodeValue[0],
                        input: nodeValue.input,
                        data,
                        id: idInit(object_join(
                            conf, {
                            nodeName: 'value',
                            i
                        })),//`${conf.pref}-value-${conf.three_id}-${conf.index}-${i}`,
                        parent_id: conf.parent_id,
                    }, this);
                    this.AddNode(obj);
                }
            }
        } else if (conf.node.attributes[i].nodeName == 'setfocus') {
            setTimeout(() => {
                conf.node.focus();
            },10);
        } else if (conf.node.attributes[i].nodeName !== 'value') {
            this.AnalyzeAttribute(object_join(
                conf, {
                attr: conf.node.attributes[i],
                i
            }));
        }
    }
    if (conf.node.children.length !== 0) {
        for( let i = 0; i < conf.node.children.length; i++) {
            this.NodeAnalyze(object_join(
                conf, {
                node: conf.node.children[i],
                pref: conf.pref + conf.index,//`${conf.pref}${String.fromCharCode(conf.index)}`,
                index: i,
                three_id: conf.three_id + 1,
            }));
        }
    }
}
Ijs.prototype.ClassicNode = function(conf) {
    for (let i = 0; i < conf.node.attributes.length; i++) {
        this.AnalyzeAttribute(object_join(
            conf, {
            attr: conf.node.attributes[i],
            i
        }));
    }
    if (conf.node.children.length === 0) {
        this.AnalyzeAttribute(object_join(
            conf, {
            attr: {
                nodeValue: conf.node.textContent,
                nodeName: 'textContent',
            },
            i: 0
        }));
    } else {
        for( let i = 0; i < conf.node.children.length; i++) {
            this.NodeAnalyze(object_join(
                conf,{
                node: conf.node.children[i],
                pref: `${conf.pref}${conf.index}`,//`${conf.pref}${String.fromCharCode(conf.index)}`,
                index: i,
                three_id: conf.three_id + 1,
            }));
        }
    }
}
Ijs.prototype.AddNode = function(obj, isApi = false) {
    this.data.push(obj);
    const datas = this.ParseKeys({ data: obj.data, pref: obj.path, log: obj.obj == 'input' });
    datas.forEach(data => {
        data = data.split('.');
        if (data[0] == 'state') data = data.slice(1);
        data = data.join('.');
        if (!this.keys[data]) this.keys[data] = [];
        if (this.keys[data].indexOf(obj.id) === -1) this.keys[data].push(obj.id);
        if (isApi) {
            if (!this.apis.keys[data]) this.apis.keys[data] = [];
            if (this.apis.keys[data].indexOf(obj.id) === -1) this.apis.keys[data].push(obj.id);
        }
    });
}
Ijs.prototype.AddIfCondition = function(obj) {
    this.helps.data.push(obj);
    const datas = this.ParseKeys({ data: obj.data, pref: obj.path, state: true });
    datas.forEach(data => {
        data = data.split('.');
        if (data[0] == 'state') data = data.slice(1);
        data = data.join('.');
        if (!this.helps.keys[data]) this.helps.keys[data] = [];
        if (this.helps.keys[data].indexOf(obj.id) === -1) this.helps.keys[data].push(obj.id);
        if (!this.helps.helpKeys[data]) this.helps.helpKeys[data] = [];
        if (this.helps.helpKeys[data].indexOf(obj.ifId) === -1) this.helps.helpKeys[data].push(obj.ifId);
    });
}
Ijs.prototype.AddHelpNode = function(obj) {
    this.helps.objects.push(obj);
    if (obj.data) {
        const datas = this.ParseKeys({ data: obj.data, pref: obj.path, state: true });
        datas.forEach(data => {
            if (!this.helps.helpKeys[data]) this.helps.helpKeys[data] = [];
            if (this.helps.helpKeys[data].indexOf(obj.id) === -1) this.helps.helpKeys[data].push(obj.id);
        });
    }
}
Ijs.prototype.UpdateState = function(path) {
    // console.log(path);
    if (this.keys[path]) {
        this.keys[path].forEach(id => this.updateIds[id] = 1);
    }
    if (this.helps.keys[path]) {
        this.helps.keys[path].forEach(id => this.updateConditionIds[id] = 1);
    }
    if (this.helps.helpKeys[path]) {
        this.helps.helpKeys[path].forEach(id => this.updateIfIds[id] = 1);
    }
    if(this.apis.keys[path]) {
        this.apis.keys[path].forEach(id => this.updateApiIds[id] = 1);
    }
    this.paths[`watch.${path}`] = 1;
    clearTimeout(this.updateTimer);
    this.updateTimer = setTimeout(() => {
        this.tmp = {};
        this.ChangeInit();
        this.updateIds = {};
        this.updateConditionIds = {};
        this.updateIfIds = {};
        this.updateApiIds = {};
        this.paths = {};
    },0);
}
Ijs.prototype.ChangeInit = function() {
    Object.keys(this.updateApiIds).forEach(id => this.api(id).reData());
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

    const uniquePath = Object.keys(this.paths);
    setTimeout(() => {
        this.WatchInit(uniquePath);
    },1);
}
Ijs.prototype.ModelInit = function(model) {
    this.tmp = {};
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
}
Ijs.prototype.GetUniqueIds = function(model, data, id) {
    const allItems = data.filter(item => model === '*' || !item.models || item.models.indexOf(model) !== -1);
    let uniqueIds = [];

    allItems.forEach(item => {
        if (uniqueIds.indexOf(item[id]) === -1) {
            uniqueIds.push(item[id]);
        }
    });

    return uniqueIds;
}
Ijs.prototype.HelpInit = function(uniqueIds, data) {
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
Ijs.prototype.WatchInit = function(uniquePath) {
    uniquePath.forEach(id => {
        this.GetData({ name: id, pref: '' });
    });
}
Ijs.prototype.DataInit = function(uniqueIds, data) {
    let results = {};

    uniqueIds.forEach(id => {
        const items = data.filter(item => item.id === id);
        items.forEach(item => {
            const result = this.GetData({ name: item.data, pref: item.path, not_null: item.attr === 'condition' });
            if ( !results[item.id] ) {
                results[item.id] = {
                    node: item.node,
                    text: item.input,
                    attr: item.attr,
                    focus: item.focus
                };
            }
            results[item.id].text = results[item.id].text
                .replace(item.mask, result);
        });
    });
    for (const i in results) {
        if(results[i].attr === 'textContent') {
            results[i].node.innerHTML = '';
            results[i].node.innerHTML = results[i].text;
            // results[i].node.append(results[i].text);
        } else {
            if (results[i].attr == 'value' && results[i].node.tagName == 'SELECT') {
                results[i].node.value = results[i].text;
            } else if (!results[i].focus && results[i].attr == 'value' && (results[i].node.tagName == 'INPUT' || results[i].node.tagName == 'TEXTAREA')) {
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
Ijs.prototype.ModifyPathName = function(name) {
    const path = name.toString().trim().split('.');
    if (path[0] === 'state' || path[0] === '$f') {
        return name
            .replace('state', `items.${path[1]}`)
            .replace('$f', 'functions');
    } else if (path[0] === 'watch' || path[0] === 'localStorage') {
        return name;
    } else {
        return `items.${path[0]}.${name}`;
    }
}
Ijs.prototype.GetFuncData = function({ model, params, pref }) {
    if (!params) return model();

    params = GetParamsFromString(params).map(name => {
        if (name[0] == '\\') {
            name = name.slice(1);
            return name;
        }
        return this.GetData({ name, pref });
    });
    return model(...params);
}
Ijs.prototype.GetModels = function({ pref, data }) {
    return this.ParseKeys({pref, data, state: true }).map(item => {
        return item.trim().split('.')[0] != 'state' ? item.trim().split('.')[0] :
            item.trim().split('.').length > 1 ? item.trim().split('.')[1] : 'state';
    });
}
Ijs.prototype.ParseKeys = function({ pref, data, log }) {
    const res = this.ParseData({ data, pref, state: true });
    let tmpKeys = [];
    let keys = [];
    let keysTmp;
    if (res.params) {
        GetParamsFromString(res.params[1]).forEach(item => {
            keys = [
                ...keys,
                ...this.ParseKeys({ data: item, pref})
            ];
        });
    } else {
        while ((keysTmp = this.maksKeysReg.exec(res.data)) != null) {
            tmpKeys.push(keysTmp[1]);
        }
        
        if (tmpKeys.length === 0) {
            keys.push(res.data);
        }

        tmpKeys.forEach(key => {
            keys = [
                ...keys,
                ...this.ParseKeys({ data: key, pref, reget: true})
            ];
        });
    }
    return keys;
}
Ijs.prototype.ReKeys = function({ data, pref }) {
    let keysTmp, findKeysTmp;
    while ((keysTmp = this.maksKeysReg.exec(data)) != null) {
        findKeysTmp = keysTmp;
    }
    if (findKeysTmp) {
        data = data.replace(findKeysTmp[0], `.${this.GetData({ name: findKeysTmp[1], pref})}`);
    }
    return data;
}
Ijs.prototype.ParseData = function({ pref, data, state }, isRePref = false) {
    data = this.ReKeys({ pref, data });
    let tmp,paramValueTmp;
    while ((paramValueTmp = this.maksParamsReg.exec(data)) != null) {
        tmp = paramValueTmp;
    }
    if (tmp) {
        return { data: `$f.${data.replace(tmp[0], isRePref ? '()' : '')}`, params: tmp };
    }
    const path = data.split('.');
    if (path[0] == 'state') return state ? { data: path.slice(1).join('.'), params: null} : { data, params: null };
    while ((paramValueTmp = this.maksParamsReg.exec(pref)) != null) {
        tmp = paramValueTmp;
    }
    if (tmp) {
        return { data: `${pref.replace(tmp[0], isRePref ? '()' : '')}${data}`, params: tmp };
    }
    const prefPath = pref.split('.');
    if (prefPath[0] == 'state') isRePref = false;
    return { data: isRePref ? `state.${pref}${data}` : `${pref}${data}`, params: null };
}
Ijs.prototype.RePref = function({ pref, data, state }) {
    let answer = this.ParseData({ data, pref }, true);
    if (answer.params) {
        answer.data = answer.data.replace('()',
            `(${GetParamsFromString(answer.params[1]).map(data => {
                return this.RePref({ data, pref });
            }).join(',')})`
        );
        if (state) answer.data = `state.${answer.data}`;
    }
    return answer.data;
}
Ijs.prototype.GetData = function({ name, pref, not_null }) {
    pref = pref ? pref : '';
    not_null = not_null ? not_null : false;
    let { data, params } = this.ParseData({ data: name, pref });
    let path = this.ModifyPathName(data).trim().split('.');
    let model = this.models;
    let cache = pref;
    for (var i in path) {
        cache = cache ? `${cache}.${path[i]}` : path[i];
        if(i == 0 && path[i] == 'localStorage')
            return localStorage.getItem(path[1]);
        if (path[i] == '*')
            return this.CleanData(model);
        if (isFinite(model))
            return parseFloat(model);
        if (model == path[i])
            return true;
        else if (model[path[i]] || model[path[i]] == 0) {
            model = model[path[i]];
            if (typeof model == 'function') {
                cache = `${cache}(${params ? params[1] : ''})`;
                // cache = this.RePref({data: cache, pref});
                if (!this.tmp[cache]) {
                    model = this.GetFuncData({ model, pref, params: params ? params[1] : '' });
                    this.tmp[cache] = model;
                    setTimeout(() => {
                        delete this.tmp[cache];
                    },100);
                } else {
                    model = this.tmp[cache];
                }
            }
        } else
            return model[path[i]] === undefined && !not_null ? '' : model[path[i]];
    }
    if (name == 'state.$event') return model;
    if (!not_null) return this.CleanData(model);
    if (!model) return null;
    else if (typeof model === 'object') {
        if (!Array.isArray(model)) {
            if (Object.keys(model).length === 0) return false;
            return true;
        } else if (model.length === 0 || model === undefined || model === null) return false;
        else return true;
    }
    else if (typeof model === 'string') return `'${model}'`;
    return model;
}
Ijs.prototype.CleanData = function(model) {
    if (typeof model == 'object') {
        if (Array.isArray(model)) {
            let newModel = [];
            for (const i in model) {
                if (i !== '__data') {
                    newModel[i] = this.CleanData(model[i]);
                }
            }
            return newModel;
        } else if (model !== undefined && model !== null) {
            let newModel = {}
            for (const i in model) {
                if (i !== '__data') {
                    newModel[i] = this.CleanData(model[i]);
                }
            }
            return newModel;
        } else {
            return model;
        }
    }  else {
        return model;
    }
}
Ijs.prototype.SetData = function(name, data) {
    let model = this.models;
    const path = this.ModifyPathName(name).trim().split('.');
    for (var i in path) {
        if (model[path[i]] && i < path.length - 1 ) {
            model = model[path[i]];
        } else if (path.length - 1 == i) {
            model[path[i]] = data;
        } else {
            model[path[i]] = {};
            model = model[path[i]];
        }
    }
}

Ijs.prototype.CleanKeys = function(id) {
    //event 
    this.events.filter(event => event.parent_id == id).forEach(event => {
        event.RemoveEvent();
    });
    this.events = this.events.filter(item => item.parent_id !== id);
    //apis
    this.apis.objects.filter(api => api.parent_id == id).forEach(api => {
        api.active = false;
        this.SetData(`$.loading.${api.id}`, false);
    });
    //classses
    this.classes.filter(item => item.parent_id == id).forEach(item => {
        clearTimeout(item.timerId);
    });
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

function Ijs_Array() {
    this.items = [];
}


Ijs_Array.prototype.add = function(model) {
    const findIndex = this.items.findIndex(item => item.id === model.id);
    if (findIndex === -1) {
    this.items.push(model);
    model.init();
    } else {
    console.error(`Duplicate api model ${model.id}`);
    this.update(findIndex, model);
    }
}
Ijs_Array.prototype.update = function(model) {
    //TO DO
}

function Ijs_Object() {
    this.items = {};
    this.functions = {};
    this.watch = {};
}
Ijs_Object.prototype.add = function({ model, id, clean }) {
        const tmp = {};
        tmp[id] = model;
        if (!this.items[id]) {
            this.items[id] = InitData(tmp);
        } else {
            if (clean) this.items[id] = InitData(ObjectAssign({}, tmp));
            else this.items[id] = InitData(ObjectAssign(ObjectAssign({},this.items[id]), tmp));
        }
    }
Ijs_Object.prototype.addFunctions = function(funcs) {
    this.functions = ObjectAssign(this.functions, funcs);
}
Ijs_Object.prototype.addWatch = function(funcs) {
    this.watch = ObjectAssign(this.watch, funcs);
}

function ObjectAssign(originObj, newObj) {
    for (let i in newObj) {
        if (i != '__data') {
            if (originObj === null) originObj = {};
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
  
function Ijs_API(api, self) {
    this.self = self;
    this.active = true;
    this.timerId = null;
    this.sendTimerId = null;
    this.dataPathReg = new RegExp("{{([\s\S]*?)}}",'gm');// /{{([\s\S]*?)}}/gm;
    this.url = api.url;
    this.method = api.method;
    this.action = api.action;
    this.model = api.model;
    this.node = api.node;
    this.id = api.id;
    this.localStorage = api.localStorage;
    this.load = false;
    this.parent_id = api.parent_id;
    this.credentials = api.credentials;
    this.pref = api.path;
    this.success_callback = null;
    this.error_callback = null;
    let paramValue;
    this.jsonData = api.data; 
    while ((paramValue = this.dataPathReg.exec(api.data)) != null) {
        let data = this.self.RePref({ data: paramValue[1], pref: this.pref, state: 1 });
        this.jsonData = this.jsonData.replace(paramValue[0], data);
        paramValue[1] = paramValue[1].replace('state.','');
        if (!this.self.apis.keys[paramValue[1]]) this.self.apis.keys[paramValue[1]] = [];
        if (this.self.apis.keys[paramValue[1]].indexOf(this.id) === -1) {
            this.self.apis.keys[paramValue[1]].push(this.id);
        }
    }
    if (this.action === 'READ') {
        setTimeout(() => {
            let json;
            eval(`json = ${this.jsonData};`);
            this.data = json;
            if (this.localStorage) {
                const model = JSON.parse(localStorage.getItem(this.id) ? localStorage.getItem(this.id) : 'null');
                if (model) {
                    setTimeout(() => {
                        Ijs_API_dataInit({
                            model,
                            id: this.id
                        });
                    },0);
                }
            }
            if (this.action === 'READ') this.init();
        },0);
    }
}

Ijs_API.prototype.reConf = function(api) {
    if (this.action == 'SEND') {
        this.url = api.url;
        this.method = api.method;
        this.action = api.action;
        this.model = api.model;
        this.id = api.id;
        this.localStorage = api.localStorage;
        this.parent_id = api.parent_id;
        this.credentials = api.credentials;
        this.pref = api.path;
        let paramValue;
        this.jsonData = api.data; 
        while ((paramValue = this.dataPathReg.exec(api.data)) != null) {
            let data = this.self.RePref({ data: paramValue[1], pref: this.pref, state: 1 });
            this.jsonData = this.jsonData.replace(paramValue[0], data);
            paramValue[1] = paramValue[1].replace('state.','');
            if (!this.self.apis.keys[paramValue[1]]) this.self.apis.keys[paramValue[1]] = [];
            if (this.self.apis.keys[paramValue[1]].indexOf(this.id) === -1) {
                this.self.apis.keys[paramValue[1]].push(this.id);
            }
        }
    }
    this.reData(api);
}
Ijs_API.prototype.reData = function(conf) {
    if (this.action !== 'SEND') {
        clearTimeout(this.timerId);
        const _this = this;
        this.timerId = setTimeout(() => {
            if (!_this.active) return;
            let modify = false;
            if (conf && conf.data) {
                this.jsonData = conf.data;
                let paramValue;
                while ((paramValue = this.dataPathReg.exec(conf.data)) != null) {
                    let data = this.self.RePref({ data: paramValue[1], pref: this.pref, state: 1 });
                    this.jsonData = this.jsonData.replace(paramValue[0], data);
                    paramValue[1] = paramValue[1].replace('state.','');
                    if (!this.self.apis.keys[paramValue[1]]) this.self.apis.keys[paramValue[1]] = [];
                    if (this.self.apis.keys[paramValue[1]].indexOf(this.id) === -1) {
                        this.self.apis.keys[paramValue[1]].push(this.id);
                    }
                }
            }
            let json;
            eval(`json = ${_this.jsonData};`);
            if (JSON.stringify(json) !== JSON.stringify(_this.data)) {
                _this.data = json;
                modify = true;
            }
            // else if (conf && conf.data) {
            //     let paramValue, jsonData;
            //     jsonData = conf.data; 
            //     while ((paramValue = this.dataPathReg.exec(conf.data)) != null) {
            //         jsonData = jsonData.replace(paramValue[0], paramValue[1]);
            //         paramValue[1] = paramValue[1].replace('state.','');
            //         if (!this.self.apis.keys[paramValue[1]]) this.self.apis.keys[paramValue[1]] = [];
            //         if (this.self.apis.keys[paramValue[1]].indexOf(this.id) === -1) {
            //             this.self.apis.keys[paramValue[1]].push(this.id);
            //         }
            //     }
            //     eval(`json = ${jsonData};`);
            //     if (JSON.stringify(json) !== JSON.stringify(_this.data)) {
            //         _this.data = json;
            //         this.jsonData = jsonData;
            //         modify = true;
            //     }
            // }
            if (conf && conf.url && _this.url != conf.url) {
                _this.url = conf.url;
                modify = true;
            } else if ((!conf || !conf.url) && _this.url != _this.node.getAttribute('url')) {
                _this.url = _this.node.getAttribute('url');
                modify = true;
            }
            if (modify && _this.action !== 'SEND') {
                window.ijs.SetData(`$.loading.${this.id}`, false);
                _this.init(conf);
            } else {
                window.ijs.SetData(`$.loading.${this.id}`, true);
            }
        },10);
    }
}
Ijs_API.prototype.changeData = function(data) {
    this.data = ObjectAssign(this.data, data);
    return this;
}
Ijs_API.prototype.send = function(conf) {
    window.ijs.SetData(`$.loading.${this.id}`, false);
    clearTimeout(this.sendTimerId);
    const _this = this;
    this.sendTimerId = setTimeout(() => {
        // if (!_this.active) return;
        let json;
        eval(`json = ${_this.jsonData};`);
        _this.data = json;
        if (conf && conf.url && _this.url != conf.url) {
            _this.url = conf.url;
        } else if ((!conf || !conf.url) && _this.url != _this.node.getAttribute('url')) {
            _this.url = _this.node.getAttribute('url');
        }
        _this.init(conf);
    },10);
    return this;
}
Ijs_API.prototype.init = function(conf) {
    if (conf && conf.success) this.success_callback = conf.success;
    else this.success_callback = null;
    if (conf && conf.error) this.error_callback = conf.error;
    else this.error_callback = null;
    aapi({
        url: this.url,
        method: this.method,
        data: this.data,
    },
    this.onload,
    this.onerror,
    this);
}
Ijs_API.prototype.onload = function(response, _this) {
    _this.load = true;
    window.ijs.SetData(`$.loading.${_this.id}`, true);
    let model = null;
    if (_this.model && _this.model !== '*') {
        model = response && response[_this.model] ? response[_this.model] : null;
    } else if (_this.model === '*') {
        model = response;
    }
    if (model) {
        if (_this.localStorage) {
            localStorage.setItem(_this.id, JSON.stringify(model));
        }
        Ijs_API_dataInit({
            model,
            id: _this.id
        });
    }
    if (_this.success_callback) _this.success_callback(response);
}
Ijs_API.prototype.onerror = function(status, response, _this) {
    localStorage.removeItem(_this.id);
    Ijs_API_dataInit({
        model: null,
        id: _this.id
    });
    if (_this.error_callback) _this.error_callback(status, response);
}
function Ijs_API_dataInit({model, id}) {
    window.ijs.models.add({
        model,
        id,
        clean: true
    });
    window.state[id] = window.ijs.models.items[id][id];
    window.ijs.ModelInit(id);
}

async function jspi(api) {
    return new Promise(function (resolve, reject) {
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
            resolve(xhr.response);
        };
        xhr.onerror = function() {
            reject({status: xhr.status, response: xhr.response});
        };
        xhr.onprogress = function(event) { // запускается периодически
            // event.loaded - количество загруженных байт
            // event.lengthComputable = равно true, если сервер присылает заголовок Content-Length
            // event.total - количество байт всего (только если lengthComputable равно true)
            // console.log(`Загружено ${event.loaded} из ${event.total}`);
        };
    });
    
}

function aapi(api, callback = null, callbackError = null, self = null) {
    this.url = api.url;
    this.data = api.data;
    this.method = api.method ? api.method : 'GET';
    this.credentials = api.credentials ? api.credentials : false;
    let xhr = new XMLHttpRequest();
    if (this.method == 'POST') {
        xhr.open(this.method, this.url);
        // xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + boundary);
        // xhr.setRequestHeader('Content-type', 'application/json; charset=utf-8');
    } else {
        let p = '';
        for (i in this.data) {
            p = p ? `${p}&` : p;
            p = `${p}${i}=${encodeURI(this.data[i])}`;
        }
        xhr.open(this.method, `${p ? `${this.url}?${p}` : this.url}`);
    }
    if (!api.dataType || api.dataType != 'html')
        xhr.responseType = api.dataType ? api.dataType : 'json';
    if (this.credentials) xhr.withCredentials = true;
    if (this.method !== 'POST') {
        xhr.send(JSON.stringify(this.data));
    } else {
        // var boundary = String(Math.random()).slice(2);
        // var boundaryMiddle = '--' + boundary + '\r\n';
        // var boundaryLast = '--' + boundary + '--\r\n'

        // var body = ['\r\n'];
        // for (var key in this.data) {
        //     // добавление поля
        //     body.push('Content-Disposition: form-data; name="' + key + '"\r\n\r\n' + this.data[key] + '\r\n');
        // }

        // body = body.join(boundaryMiddle) + boundaryLast;
        // xhr.send(body);
        var formData = new FormData();
        for (var key in this.data) {
            formData.append(key, this.data[key]);
        }
        xhr.send(formData);
    }

    xhr.onload = function() {
        if (xhr.status === 200) {
            if (callback) callback(xhr.response, self);
        } else {
            if (callbackError) callbackError(xhr.status, xhr.response, self);
        }
    };
    xhr.onerror = function() {
        if (callbackError) callbackError(xhr.status, xhr.response, self);
    };
    xhr.onprogress = function(event) { // запускается периодически
        // event.loaded - количество загруженных байт
        // event.lengthComputable = равно true, если сервер присылает заголовок Content-Length
        // event.total - количество байт всего (только если lengthComputable равно true)
        // console.log(`Загружено ${event.loaded} из ${event.total}`);
    };
}

function CleanDataInit(model) {
    if (typeof model == 'object') {
        if (Array.isArray(model)) {
            let newModel = [];
            for (const i in model) {
                if (i !== '__data') {
                    newModel[i] = CleanDataInit(model[i]);
                }
            }
            return newModel;
        } else if (model !== undefined && model !== null) {
            let newModel = {}
            for (const i in model) {
                if (i !== '__data') {
                    newModel[i] = CleanDataInit(model[i]);
                }
            }
            return newModel;
        } else {
            return model;
        }
    }  else {
        return model;
    }
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
    Object.defineProperty(init_data, "__data", {
        enumerable: false  // don't make it appear in a for in loop
      });
    
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
                    return CleanDataInit(init_data.__data[field_name]);
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
    this.obj = 'input';
    this.redata = 0;
    this.path = conf.path ? conf.path : '';
    this.node = conf.node;
    this.model = conf.model;
    this.models = [this.model];
    this.mask = conf.mask ? conf.mask : null;
    this.data = conf.data ? conf.data : null;
    this.input = conf.input ? conf.input : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.id = conf.id;
    this.timerId = null;
    this.self = self;
    this.focus = false;
    
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
        this.node.value = this.self.GetData({ name: this.data, pref: this.path });
    } else if (this.node.tagName === 'TEXTAREA') {
        this.attr = 'value';
        this.node.addEventListener('keyup', this.Change);
        this.node.addEventListener('focus', () => {
            this.focus = true;
        });
        this.node.addEventListener('focusout', () => {
            this.focus = false;
        });
        this.node.value = this.self.GetData({ name: this.data, pref: this.path });
    } else if (type == 'checkbox') {
        this.attr = 'checked';
        this.node.addEventListener('change', this.Checked);
        this.node.checked = IsJsonString(this.self.GetData({ name: this.data, pref: this.path }))
            ? JSON.parse(this.self.GetData({ name: this.data, pref: this.path }))
            : this.self.GetData({ name: this.data, pref: this.path }) ? true : false;
    } else if (type == 'radio') {
        this.attr = 'radio';
        this.node.addEventListener('change', this.Radio);
        if (this.node.value == this.self.GetData({ name: this.data, pref: this.path })) {
            this.node.checked = true;
        }
    } else {
        this.attr = 'value';
        this.node.addEventListener('keyup', this.Change);
        this.node.addEventListener('focus', () => {
            this.focus = true;
        });
        this.node.addEventListener('focusout', () => {
            this.focus = false;
        });
        this.node.value = this.self.GetData({ name: this.data, pref: this.path });
    }
}
IjsInputDom.prototype.Checked = function(e) {
    const _this = this;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
        let { data } = _this.self.ParseData({ data: _this.data, pref: _this.path });
        _this.self.SetData(data, e.target.checked);
    },1);
  }
IjsInputDom.prototype.Radio = function(e) {
    const _this = this;
    if (e.target.checked) {
      clearTimeout(this.timerId);
      this.timerId = setTimeout(() => {
        let { data } = _this.self.ParseData({ data: _this.data, pref: _this.path });
        _this.self.SetData(data, e.target.value);
      },1);
    }
  }
IjsInputDom.prototype.Change = function(e) {
    const _this = this;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
        let { data } = _this.self.ParseData({ data: _this.data, pref: _this.path });
        _this.self.SetData(data, e.target.value);
    },1);
}

function IjsClassDom(conf) {
    this.data = conf.data;
    this.parent_id = conf.parent_id;
    this.node = conf.node;
    this.timerId = null;
    this.ReClass();
}
IjsClassDom.prototype.ReClass = function() {
    const item = this;
    clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
        let json;
        eval(`json = ${item.data};`);
        for (const className in json) {
            if (!json[className]) item.node.classList.remove(className);
            else item.node.classList.add(className);
        }
    },10);
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
    this.textContentReg = new RegExp("{([\s\S]*?)}",'gm');// /{([\s\S]*?)}/gm;
    this.paramsReg = new RegExp("\(([\s\S]*?)\)",'gm');// /\(([\s\S]*?)\)/gm;
    this.maksParamsReg = new RegExp("\((.*)\)",'gm');// /\((.*)\)/gm;
    this.maksContentReg = new RegExp("{(.*)}",'gm');// /{(.*)}/gm;
    this.funcReg = new RegExp("^([\s\S]*?)\(",'gm');// /^([\s\S]*?)\(/gm;
    
    this.helpNode = document.createElement('DIV');
    this.nodes = [];
    for( let i = 0; i < this.node.children.length; i++) {
        this.nodes.push(this.node.children[i].cloneNode(true));
    }
    this.node.innerHTML = '';

    let nodeValueTmp;
    this.data = this.node.getAttribute('items');
    while ((nodeValueTmp = this.maksContentReg.exec(this.data)) != null) {
        this.data = nodeValueTmp[1];
    }

    if (!this.model) {
        this.model = this.data.trim().split('.')[0];
    }
    this.models = this.self.GetModels({pref: this.path, data: this.data});
    this.newPath = this.self.RePref({ data: this.data, pref: this.path });

    this.ReInit();
}
IjsForDom.prototype.ReInit = function() {
    const items = this.self.GetData({ name: this.data, pref: this.path });
    if (!items) {
        // console.error(`${this.data} not find`);
        return;
    } else if (!Array.isArray(items)) {
        // console.error(`${this.data} not array`);
        return;
    }
    this.node.innerHTML = '';
    this.self.CleanKeys(this.id);
    items.forEach((item, key) => {
        this.nodes.forEach(node => {
            this.helpNode.append(node.cloneNode(true));
        });
        this.self.NodeAnalyze({
            node: this.helpNode,
            path: `${this.newPath}.${key}.`,
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

function IjsEventDom(conf, self) {
    this.model = conf.model;
    this.node = conf.node;
    this.attr = conf.attr;
    this.nodeName = conf.attr.nodeName
    this.path = conf.path;
    this.pref = conf.pref ? conf.pref : null;
    this.index = conf.index ? conf.index : null;
    this.three_id = conf.three_id ? conf.three_id : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.self = self;
    this.funcReg = new RegExp("^([\s\S]*?)\(",'gm');// /^([\s\S]*?)\(/gm;
    this.AddEvent();
}
IjsEventDom.prototype.RemoveEvent = function () {
    if (this.nodeName === 'click') {
        this.node.removeEventListener('click', () => { this.DefClick(); });
    } else if (this.nodeName === 'hover') {
        this.node.removeEventListener('mouseenter', () => { this.DefClick(); });
    } else if (this.nodeName === 'thisclick') {
        this.node.removeEventListener('click', (e) => { this.ThisClick(e); });
    } else if (this.nodeName === 'keyup') {
        this.node.removeEventListener('keyup', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'change') {
        this.node.removeEventListener('change', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'focusout') {
        this.node.removeEventListener('blur', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'enter') {
        this.node.removeEventListener('keyup', (e) => { this.EnterEvent(e); });
    }
}
IjsEventDom.prototype.AddEvent = function() {
    if (this.nodeName === 'click') {
        this.node.addEventListener('click', (e) => { this.DefClick(e); });
    } else if (this.nodeName === 'hover') {
        this.node.addEventListener('mouseenter', (e) => { this.DefClick(e); });
    } else if (this.nodeName === 'thisclick') {
        this.node.addEventListener('click', (e) => { this.ThisClick(e); });
    } else if (this.nodeName === 'keyup') {
        this.node.addEventListener('keyup', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'change') {
        this.node.addEventListener('change', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'focus') {
        this.node.addEventListener('focus', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'blur') {
        this.node.addEventListener('blur', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'focusout') {
        this.node.addEventListener('blur', (e) => { this.KeyEvent(e); });
    } else if (this.nodeName === 'enter') {
        this.node.addEventListener('keyup', (e) => { this.EnterEvent(e); });
    }
}
IjsEventDom.prototype.EnterEvent = function(e) {
    if (e.key === 'Enter') {
        this.self.models.items.$event.$event = e;
        this.ClickEvent();
    }
}
IjsEventDom.prototype.KeyEvent = function(e) {
    this.self.models.items.$event.$event = e;
    this.ClickEvent();
}
IjsEventDom.prototype.DefClick = function(e) {
    this.self.models.items.$event.$event = e;
    this.ClickEvent();
}
IjsEventDom.prototype.ThisClick = function(e) {
    if (e.target != this.node) return;
    this.self.models.items.$event.$event = e;
    this.ClickEvent();
}
IjsEventDom.prototype.ClickEvent = function() {
    let paramFunc;
    let data = this.attr.nodeValue;
    let is_set;
    const funcs = data.split(';');
    funcs.forEach(func => {
        is_set = false;
        while (( paramFunc = this.funcReg.exec(func)) != null) {
            if (paramFunc[1] === 'set') {
                is_set = true;
                let { params } = this.self.ParseData({
                    data: func,
                    pref: this.path
                });
                if (!params) return;
                params = GetParamsFromString(params[1]);
                if (params.length < 2) return;

                const answer = this.self.ParseData({
                    data: params[0],
                    pref: this.path
                });
                params[0] = answer.data;
                if (params[1][0] == '\\') {
                    params[1] = params[1].slice(1);
                    params[1] = IsJsonString(params[1]) ? JSON.parse(params[1]) : params[1];
                } else {
                    params[1] = this.self.GetData({ name: params[1], pref: this.path });
                }
                this.self.SetData(...params);
            } else if (paramFunc[1] === 'api') {
                is_set = true;
                let { params } = this.self.ParseData({
                    data: func,
                    pref: this.path
                });
                if (!params) return;
                this.self.api(params[1]).send();
            }
        }
        if (!is_set) {
            func = func.replace('$event', 'state.$event');
            this.self.GetData({ name: func, pref: this.path });
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
    this.waiter = 0;
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
            this.waiter++;
            jspi({ url: script.getAttribute('src'), dataType: 'html' })
                .then((answer) => {
                    eval(answer);
                    this.waiter--;
                    if (this.waiter === 0) this.ReInit(page);
                });
        }
    });
    if (this.waiter === 0) this.ReInit(page);
}
// IjsPageDom.prototype.ReInit = function() { return false; }
IjsPageDom.prototype.ReInit = function(page) {
    if (!page) return false;
    for( let i = 0; i < page.children.length; i++) {
        if (page.children[i].tagName != 'SCRIPT') {
            this.helpNode.append(page.children[i]);
        }
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
    // this.models = self.GetModels({pref: conf.path, data: nodeValue[1]});
    this.path = conf.path;
    this.id = conf.id ? conf.id : null;
    this.pref = conf.pref ? conf.pref : null;
    this.index = conf.index ? conf.index : null;
    this.three_id = conf.three_id ? conf.three_id : null;
    this.parent_id = conf.parent_id ? conf.parent_id : null;
    this.self = self;
    this.textContentReg = new RegExp("{([\s\S]*?)}",'gm');// /{([\s\S]*?)}/gm;
    this.paramsReg = new RegExp("\(([\s\S]*?)\)",'gm');// /\(([\s\S]*?)\)/gm;
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
        return eval(object.node.getAttribute('condition'));
    });
    if ((!object || !object.init) && old_object) {
        old_object.node.innerHTML = '';
        old_object.node.style.display = 'none';
        old_object.init = false;
        this.self.CleanKeys(this.id);
    }
    if (!object) return false;
    object.node.style.display = 'block';
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
        const models = this.self.GetModels({pref: this.path, data: nodeValue[1]});
        let data = nodeValue[1].trim();
        const obj = {
            node,
            model,
            models,
            path: this.path,
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
        new_data = new_data.replace(obj.mask, this.self.GetData({ name: obj.data, pref: this.path, not_null: true }));
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
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
function object_join(object_one, object_two) {
    let new_object = Object.assign({},object_one);
    return Object.assign(new_object,object_two);
}
;(function(window){
    var _config = {
        // 同seajs的base，模块系统的基础路径，一般设置与seajs同一值
        base: '',

        // 请求合并压缩后的css文件所在的基础路径，必须指定，否则容易出现找不到文件
        combobase: '',

        // 为true时，对css的请求都走base路径，若为false，则走combocss路径；这里为开发和测试&发布环境做切换调试使用
        debug: true,

        // 加载的css的别名（缩写）
        alias: {},

        // 由于开发时需要经常调试，css静态资源容易出现缓存，可以通过map来做开发版本控制，比如带个时间戳：map: ['.css', '.css?v=' + new Date().getTime()]
        map: [],

        // preload
        preload: []
    };

    var seacss = {
        /**
         * 参数初始化配置，多个配置对象会合并
         * @param   {object}    conf    与seacss对应的四个属性的配置对象
         */
        config: function(conf){
            // 设置base，默认为seacss所在目录路径
            if(conf.base){
                _config.base = conf.base;
                _config.base.lastIndexOf('/') === _config.base.length - 1 ? null : _config.base += '/';
            }else if(_config.base === ''){
                _config.base = getBaseUrl();
            }

            // 设置combobase，同base
            if(conf.combobase){
                _config.combobase = conf.combobase;
                _config.combobase.lastIndexOf('/') === _config.combobase.length - 1 ? null : _config.combobase += '/';
            }else if(_config.combobase === ''){
                _config.combobase = _config.base;
            }

            // 设置debug
            typeof conf.debug === 'boolean' ? _config.debug = conf.debug : null;

            // 设置alias
            extend(_config.alias, conf.alias);

            // 设置preload
            extendArray(_config.preload, conf.preload);

            // 设置map
            typeof conf.map === 'object' && conf.map instanceof Array ? _config.map = conf.map : null;

            // 相关初始化，目前只做alias的初始化
            init();
        },


        /**
         * 请求css
         * @param   {string|array}  paths   请求的css路径
         * paths的数据结构如下：
         * "xx1.css" or ["xx1.css", "xx2.css"] or ["xx1.css", ["combo1.css", "combo2.css"], ["c1.css", "c2.css"]]
         */
        use: function(paths){
            if(typeof paths !== 'string' && !(paths instanceof Array)){
                return;
            }

            // preload
            if(_config.preload.length > 0){
                var tmp = [];
                extendArray(tmp, _config.preload);
                _config.preload = [];
                for(var i = 0,l = tmp.length;i < l;i++){
                    seacss.use(tmp[i]);
                }
            }

            // head标签
            var headNode = document.getElementsByTagName('head')[0];

            if(typeof paths === 'string'){
                // 如果是字符串，则不需要判断是否使用combo
                loadSrcLink(paths);
            }else if(paths instanceof Array){
                for(var i = 0,l = paths.length;i < l;i++){
                    if(typeof paths[i] === 'string'){
                        // 如果是字符串，则不需要判断是否使用combo
                        loadSrcLink(paths[i]);
                    }else{
                        // 根据是否使用debug，单文件不请求合并的路径，多文件才请求
                        if(_config.debug){
                            for(var n = 0,m = paths[i].length;n < m;n++){
                                loadSrcLink(paths[i][n]);
                            }
                        }else{
                            // 路径拼接为: src/xx1&xx2&xx3.css
                            loadSrcLink(_config.combobase + paths[i].join('&').replace(/\.css/g, '') + '.css');
                        }
                    }
                }
            }else{
                throw("Paramters type is error!");
            }


            function loadSrcLink(path){
                // 三种加载情况
                // 1、如果以"."或"/"或"http(s):"开头，添加到__srclist
                // 2、如果在alias里，则补全url
                // 3、如果非1、2的情况，则直接请求并添加到__srclist
                if(/^\.|^\/|http[s]*:|file:/.test(path) && !__srclist[path]){
                    __srclist[path] = true;
                    headNode.appendChild(loadLink({url: path}));
                }else if(path in __aliaslist){
                    if(!__aliaslist[path].used){
                        __aliaslist[path].used = true;
                        /^\.|^\/|http[s]*:|file:/.test(__aliaslist[path].url) ? headNode.appendChild(loadLink(__aliaslist[path])) : headNode.appendChild(loadLink({url: _config.base + __aliaslist[path].url, attrs: __aliaslist[path].attrs}));
                    }
                }else{
                    if(!__srclist[path]){
                        __srclist[path] = true;
                        path.indexOf(_config.combobase) > -1 ? headNode.appendChild(loadLink({url: _config.combobase + path})) : headNode.appendChild(loadLink({url: _config.base + path}));
                    }
                }
            }
        }
    };

    // Private attributes
    var __srclist = {};
    var __aliaslist = {};
    var __base = null;


    /**
     * ====================
     * Private functions
     * :start
     * ====================
     */

    /**
     * alias的初始化
     */
    function init(){
        if(_config.alias){
            for(var itm in _config.alias){
                // if it's just a string type
                if(typeof _config.alias[itm] === 'string'){
                    __aliaslist[itm] = {
                        url: _config.alias[itm],
                        used: false
                    };
                }else{  // object setting
                    __aliaslist[itm] = {
                        url: _config.alias[itm].url,
                        attrs: _config.alias[itm].attrs,
                        used: false
                    };
                }
            }
        }
    }


    /**
     * 获取当前seacss.js所在目录路径
     */
    function getBaseUrl(){
        if(!__base){
            var scripts = document.scripts;
            for(var i = 0,l = scripts.length;i < l;i++){
                if(scripts[i].src.indexOf('seacss.js') > 0){
                    __base = scripts[i].src.substring(0, scripts[i].src.lastIndexOf('/'));
                    break;
                }
            }
        }
        return __base;
    }


    /**
     * 加载css
     * @param   {object}    link    需要加载的css对象，其数据结构：
     * {
    *      url: 'src/xxx/xxx.js',
    *      attrs: {
    *          'media': '',
    *          'hreflang': 'utf-8',
    *          'charset': 'utf-8'
    *      }
    * }
     */
    function loadLink(link){
        var tmp = document.createElement('link');
        tmp.setAttribute("rel", "stylesheet");
        tmp.setAttribute("type", "text/css");
        tmp.setAttribute("href", mapCss(link.url));
        if(link.attrs){
            for(var itm in link.attrs){
                tmp.setAttribute(itm, link.attrs[itm]);
            }
        }
        return tmp;
    }


    /**
     * 根据正则替换请求的css路径
     * @param   {string}    url      需要替换的源路径
     * @return  {string}    替换后的css路径
     * @desc
     * seacss.map需要满足以下数据结构
     * [['.css', '.css?v=1.0'], [/.css$/, '.css?v=1.0'], ...]
     */
    function mapCss(url){
        var map = _config.map;
        if(map && map instanceof Array){
            for(var i = 0,l = map.length;i < l;i++){
                url = url.replace(map[i][0], map[i][1]);
            }
        }
        return url;
    }


    /**
     * 扩展对象属性值
     * @param   {object}    src     需要扩展的对象
     * @param   {object}    exts    扩展的属性对象
     */
    function extend(src, exts){
        if(!exts){
            return;
        }
        for(var itm in exts){
            src[itm] = exts[itm];
        }
    }


    /**
     * 扩展数组值
     * @param   {array}    src     需要扩展的对象
     * @param   {array}    exts    扩展的属性对象
     */
    function extendArray(src, exts){
        if(!exts || !(exts instanceof Array)){
            return;
        }
        var tmp = {};
        for(var i = 0, l = src.length;i < l;i++){
            tmp[src[i]] = 1;
        }
        for(i = 0,l = exts.length;i < l;i++){
            if(!(exts[i] in tmp)){
                src.push(exts[i]);
                tmp[exts[i]] = 1;
            }
        }
    }

    /**
     * ====================
     * :end
     * Private functions
     * ====================
     */

    window.seacss ? null : window.seacss = seacss;
})(window);
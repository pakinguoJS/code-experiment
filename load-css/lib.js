/**
 * @class seacss
 * 同步加载css的js库
 * @singleton
 *
 * @author pakinguo <pakinguo@tencent.com>
 *
 * 使用示例：
 *
 *      @example
 *      seacss.config({
 *          base: "./resource",
 *          combobase: "./resource/static/css/combo",
 *          alias: {
 *              "reset.css": "static/css/common/reset.css",
 *              "common.css": "static/css/common/common.css"
 *          },
 *          map: ["reset.css", "reset.css?v=1.0.0"]
 *      });
 *
 *      // 加载单文件相对路径字符串
 *      seacss.use('static/css/module-a/index.css');
 *
 *      // 加载多文件，使用数组形式
 *      seacss.use(['static/css/module-a/index.css', 'static/css/widget/alert/index.css']);
 *
 *      // 加载多文件，并指定合并'reset.css'和'common.css'
 *      // 当debug为true时，请求的文件为：reset.css、common.css、static/css/module-a/index.css
 *      // 当debug为false时，请求的文件为：reset&common.css、static/css/module-a/index.css
 *      seacss.use([['reset.css', 'common.css'], 'static/css/module-a/index.css']);
 *
 *      // 使用media对css进行响应式设计
 *      // *当加载的文件采用object方式时，子数组合并（上一个例子）的形式会直接忽略
 *      //  即是debug为false时也不会合并指定的多文件
 *      seacss.use([
 *          'static/css/module-a/index.css',
 *          {media: "(max-width: 320px)", href: "static/css/module-a/extra-w320.css"}
 *      ]);
 *
 */
;
(function (window) {

    /**
     * @private
     * 私有配置属性，通过接口seacss.config来设置对应的配置参数
     */
    var _config = {
        /**
         * @property {String}
         * 同seajs的base，模块系统的基础路径，一般设置与seajs同一值
         */
        base: '',

        /**
         * @property {String}
         * 请求合并压缩后的css文件所在的基础路径，必须指定，否则容易出现找不到文件
         */
        combobase: '',

        /**
         * @property {Boolean}
         * 为true时，对css的请求都走base路径，若为false，则走combocss路径；这里为开发和测试&发布环境做切换调试使用
         */
        debug: true,

        /**
         * @property {Boolean}
         * 加载的css的别名（缩写），建议带.css后缀，以区分seajs模块和seacss模块
         */
        alias: {},

        /**
         * @property {Array}
         * 由于开发时需要经常调试，css静态资源容易出现缓存，可以通过map来映射模块的版本号
         * 比如带个时间戳：map: ['.css', '.css?v=' + new Date().getTime()]
         * 另外：可已通过编译工具来批量生成版本号映射
         */
        map: [],

        /**
         * @property {Array}
         * 指定页面预加载的模块（优先于seacss.use）
         */
        preload: []
    };


    var seacss = {
        /**
         * 参数初始化配置，多个配置对象会合并
         * @param {Object} conf 对应私有属性_config的6个子属性
         */
        config: function (conf) {
            // 设置base，默认为seacss所在目录路径
            if (conf.base) {
                _config.base = conf.base;
                _config.base.lastIndexOf('/') === _config.base.length - 1 ? null : _config.base += '/';
            } else if (_config.base === '') {
                _config.base = getBaseUrl();
            }

            // 设置combobase，同base
            if (conf.combobase) {
                _config.combobase = conf.combobase;
                _config.combobase.lastIndexOf('/') === _config.combobase.length - 1 ? null : _config.combobase += '/';
            } else if (_config.combobase === '') {
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
         * @param {String|Array} paths 请求的css路径
         *
         * paths的数据结构如下：
         * - 1."xx1.css"
         * - 2.["xx1.css", "xx2.css"]
         * - 3.["xx1.css", ["combo1.css", "combo2.css"], ["c1.css", "c2.css"]]
         * - 4.{href: "xx.css", media: "(max-width: 320px)"}
         */
        use: function (paths) {
            if (typeof paths !== 'string' && !(paths instanceof Array)) {
                return;
            }

            // preload
            if (_config.preload.length > 0) {
                var tmp = [];
                extendArray(tmp, _config.preload);
                _config.preload = [];
                for (var i = 0, l = tmp.length; i < l; i++) {
                    seacss.use(tmp[i]);
                }
            }

            // head标签
            var headNode = document.getElementsByTagName('head')[0];

            // 针对不同的引用方式进行处理
            // 1. seacss.use('aa.css');
            // 2. seacss.use({media: "", href:"aa.css"});
            // 3. seacss.use(['aa.css', 'bb.css']);
            // 4. seacss.use(['aa.css', {media: "", href:""}]);

            if (typeof paths === 'string') {
                // 如果是字符串，则不需要判断是否使用combo
                loadSrcLink(paths);
            } else if (typeof paths === 'object' && !(paths instanceof Array)) {
                // 如果是object，则需要添加相关参数
                loadSrcLink(paths.href, paths.media);
            } else if (paths instanceof Array) {
                for (var i = 0, l = paths.length; i < l; i++) {
                    if (typeof paths[i] === 'string') {
                        loadSrcLink(paths[i]);
                    } else if (typeof paths[i] === 'object' && !(paths[i] instanceof Array)) {
                        loadSrcLink(paths[i].href, paths[i].media);
                    } else {
                        // 根据是否使用debug，单文件不请求合并的路径，多文件才请求
                        // 其中，如果是数组中存在非字符串的元素（即是有加media的额外属性），那么也不请求合并的路径
                        if (_config.debug || testObjectInArray(paths[i])) {
                            for (var n = 0, m = paths[i].length; n < m; n++) {
                                typeof paths[i][n] === 'string' ?
                                    loadSrcLink(paths[i][n]) : loadSrcLink(paths[i][n].href, paths[i][n].media);
                            }
                        } else {
                            // 路径拼接为: src/xx1&xx2&xx3.css
                            loadSrcLink(_config.combobase + paths[i].join('&').replace(/\.css/g, '') + '.css');
                        }
                    }
                }
            } else {
                throw("Paramters type is error!");
            }

            /**
             * 根据三种模块路径的情况同步加载css
             * @private
             * @param {String} path css模块路径
             * @param {String} [media] 如果加载的css需要设置media属性，不为空则根据传入的值设定
             * @method
             */
            function loadSrcLink(path, media) {
                // 三种加载情况
                // 1、如果以"."或"/"或"http(s):"开头，添加到__srclist
                // 2、如果在alias里，则补全url
                // 3、如果非1、2的情况，则直接请求并添加到__srclist
                if (/^\.|^\/|http[s]*:|file:/.test(path) && !__srclist[path]) {
                    __srclist[path] = true;
                    headNode.appendChild(loadLink({url: path, attrs: {media: media}}));
                } else if (path in __aliaslist) {
                    if (!__aliaslist[path].used) {
                        __aliaslist[path].used = true;
                        /^\.|^\/|http[s]*:|file:/.test(__aliaslist[path].url) ? headNode.appendChild(loadLink(__aliaslist[path])) : headNode.appendChild(loadLink({
                            url: _config.base + __aliaslist[path].url,
                            attrs: __aliaslist[path].attrs
                        }));
                    }
                } else {
                    if (!__srclist[path]) {
                        __srclist[path] = true;
                        path.indexOf(_config.combobase) > -1 ? headNode.appendChild(loadLink({
                            url: _config.combobase + path,
                            attrs: {media: media}
                        })) : headNode.appendChild(loadLink({url: _config.base + path, attrs: {media: media}}));
                    }
                }
            }

            /**
             * 判断数组中是否存在object元素
             * @private
             * @param {Array} ary 需要测试的数组对象
             * @returns {Boolean} 存在object元素则返回true，否则为false
             */
            function testObjectInArray(ary) {
                var rs = false;
                for (var l = ary.length - 1; l > -1; l--) {
                    typeof ary[l] === 'string' ? null : rs = true;
                }
                return rs;
            }
        }
    };

    // Private attributes
    var __srclist = {};
    var __aliaslist = {};
    var __base = null;


    /**
     * @private
     * alias的初始化
     */
    function init() {
        if (_config.alias) {
            for (var itm in _config.alias) {
                // if it's just a string type
                if (typeof _config.alias[itm] === 'string') {
                    __aliaslist[itm] = {
                        url: _config.alias[itm],
                        used: false
                    };
                } else {  // object setting
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
     * @private
     * 获取当前seacss.js所在目录路径
     */
    function getBaseUrl() {
        if (!__base) {
            var scripts = document.scripts;
            for (var i = 0, l = scripts.length; i < l; i++) {
                if (scripts[i].src.indexOf('seacss.js') > 0) {
                    __base = scripts[i].src.substring(0, scripts[i].src.lastIndexOf('/'));
                    break;
                }
            }
        }
        return __base;
    }


    /**
     * @private
     * 加载css
     * @param {Object} link 需要加载的css对象，其数据结构：
     * {
     *      url: 'src/xxx/xxx.js',
     *      attrs: {
     *          'media': '',
     *          'hreflang': 'utf-8',
     *          'charset': 'utf-8'
     *      }
     * }
     * @return {Object} link标签对象
     */
    function loadLink(link) {
        var tmp = document.createElement('link');
        tmp.setAttribute("rel", "stylesheet");
        tmp.setAttribute("type", "text/css");
        tmp.setAttribute("href", mapCss(link.url));
        if (link.attrs) {
            for (var itm in link.attrs) {
                link.attrs[itm] ? tmp.setAttribute(itm, link.attrs[itm]) : null;
            }
        }
        return tmp;
    }


    /**
     * @private
     * 根据正则替换请求的css路径
     * @param {String} url 需要替换的源路径
     * @return {String} 替换后的css路径
     * seacss.map需要满足以下数据结构
     * [['.css', '.css?v=1.0'], [/.css$/, '.css?v=1.0'], ...]
     */
    function mapCss(url) {
        var map = _config.map;
        if (map && map instanceof Array) {
            for (var i = 0, l = map.length; i < l; i++) {
                url = url.replace(map[i][0], map[i][1]);
            }
        }
        return url;
    }


    /**
     * @private
     * 扩展对象属性值
     * @param {Object} src     需要扩展的对象
     * @param {Object} exts    扩展的属性对象
     */
    function extend(src, exts) {
        if (!exts) {
            return;
        }
        for (var itm in exts) {
            src[itm] = exts[itm];
        }
    }


    /**
     * @private
     * 扩展数组值
     * @param {Array} src     需要扩展的对象
     * @param {Array} exts    扩展的属性对象
     */
    function extendArray(src, exts) {
        if (!exts || !(exts instanceof Array)) {
            return;
        }
        var tmp = {};
        for (var i = 0, l = src.length; i < l; i++) {
            tmp[src[i]] = 1;
        }
        for (i = 0, l = exts.length; i < l; i++) {
            if (!(exts[i] in tmp)) {
                src.push(exts[i]);
                tmp[exts[i]] = 1;
            }
        }
    }


    window.seacss ? null : window.seacss = seacss;
})(window);
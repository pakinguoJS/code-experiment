$(function () {

    /**
     * store_data的数据结构:
     * {
     *      module_id: {
     *          id: module_id,
     *          name: name,
     *          params: {
     *              param_id: {
     *                  id: param_id,
     *                  key: key,
     *                  val: val
     *              }
     *          }
     *      }
     * }
     * @type {string}
     */

        // 参数过滤插件初始化
    var intanceUrlFilter = new UrlFilter(location.origin, location.pathname, location.search, location.hash);

    // 单例全局数据参数
    var table_name = 'ci_debug';
    var store_data = store.get(table_name);
    if (!store_data) {
        store_data = {};
    }

    var currMid = intanceUrlFilter.getParameters('mid');
    var tplModule = '<li class="{active}">' +
        '<a href="javascript:void(0);" data-id="{id}">{name}</a>' +
        '<div title="删除模块" class="m-delete" data-rel="delete-module" data-id="{id}"><span class="glyphicon glyphicon-remove-sign"></span></div>' +
        '</li>';
    var tplParameter = '<tr>\
                <th class="row text-center">{#}</th>\
                <td>\
                    <input type="text" class="form-control" placeholder="Key" data-name="key" value="{key}" data-id="{mid}-{pid}">\
                </td>\
                <td>\
                    <input type="text" class="form-control" placeholder="Value" data-name="val" value="{val}" data-id="{mid}-{pid}">\
                </td>\
                <td class="delete">\
                    <a href="javascript:void(0)" title="删除" data-rel="delete-param" data-id="{mid}-{pid}">\
                    <span class="glyphicon glyphicon-remove"></span>\
                    </a>\
                </td>\
                </tr>';

    init();

    function init() {
        renderModuleList(currMid);
        renderParameterList(currMid);
        bindEvent();
        $('#main').css({
            'opacity': 1
        });
    }

    // 渲染模块列表
    function renderModuleList(mid) {
        if (store_data) {
            var html = "";
            var curr;
            for (var itm in store_data) {
                curr = store_data[itm];
                html += tplModule.replace(/\{id\}/g, curr.id).replace('{name}', curr.name).replace('{active}', mid === curr.id ? 'active' : '');
            }
            if (html !== "") {
                $('#moduleList').html(html);
                $('#moduleTips').hide();
            }else{
                $('#moduleTips').show();
            }
        }
    }


    // 渲染编辑的参数列表
    function renderParameterList(mid) {
        if (store_data && (mid in store_data)) {
            $('#tips').hide();
            var list = store_data[mid].params;
            var html = "";
            var curr;
            var count = 1;
            for (var itm in list) {
                curr = list[itm];
                html += tplParameter.replace('{#}', count).replace('{key}', curr.key).replace('{val}', curr.val).replace(/\{mid\}/g, mid).replace(/\{pid\}/g, curr.id);
                count++;
            }
            if (html === '') {
                $('#parameterList').children().remove();
                $('#tips').show();
            } else {
                $('#parameterList').html(html);
            }
        } else {
            $('#parameterList').children().remove();
            $('#tips').show();
        }
    }


    function bindEvent() {
        // 新增模块
        var showAddModal = false;
        $('#addModule').click(function () {
            var mname = $('#moduleName').val();
            if (!mname) {
                $('#error').html('<div class="alert alert-danger" role="alert">模块名不为空</div>');
            } else {
                Module.storeAdd(mname, function (rs) {
                    if (rs.ret === 0) {
                        $('#myModal').modal('hide');
                        //$('#error').html('<div class="alert alert-success" role="alert">新增成功</div>');
                        $('#moduleName').val('');
                    } else {
                        $('#error').html('<div class="alert alert-danger" role="alert">' + rs.msg + '</div>');
                    }
                });
            }
            var i = setTimeout(function () {
                $('#error').html('');
                clearTimeout(i);
            }, 3000);

            showAddModal = false;
        });
        // 监听弹出表单
        $('#myModal').on('show.bs.modal', function (e) {
            showAddModal = true;
        });
        // 绑定全局的回车按键
        $(document).on('keyup', function(e){
            if(e.keyCode === 13 && showAddModal){
                $('#addModule').click();
            }
        });

        // 点击模块
        $('#moduleList').on('click', 'a', function () {
            $('#moduleList').children().removeClass('active');
            $(this).parent().addClass('active');
            currMid = $(this).attr("data-id");
            renderParameterList(currMid);
        });

        // 删除模块
        $('#moduleList').on('click', 'div[data-rel="delete-module"]', function () {
            if (confirm("确定删除此模块，连同所设置的参数列表都会删除？")) {
                Module.storeDel($(this).attr('data-id'));
            }
        });


        ///////////////////////////////////
        ///////////////////////////////////


        // 新增参数
        $('#addParam').click(function () {
            if (!currMid) {
                $('#myModal2').modal('show');
                return;
            }
            Parameter.storeAdd();
        });

        // 删除参数
        $('#parameterList').on('click', 'a[data-rel="delete-param"]', function () {
            var ids = $(this).attr('data-id').split('-');
            Parameter.storeDel(ids[0], ids[1]);
        });

        // 编辑参数
        $('#parameterList').on('keyup', 'input[type="text"]', function () {
            var $this = $(this);
            var ids = $this.attr('data-id').split('-');
            Parameter.storeUpdate(ids[0], ids[1], $this.attr('data-name'), $this.val());
        });
    }


    /**
     * 模块处理功能，包括新增模块和删除模块两个接口
     * @type {{storeAdd: Function, storeDel: Function}}
     */
    var Module = {

        /**
         * 模块新增入库
         * @param name  模块名称
         * @param callback  回调函数
         */
        storeAdd: function (name, callback) {
            var mid = 'm' + new Date().getTime();

            // 检查是否存在相同的模块名
            var checkName = false;
            for (var itm in store_data) {
                if (name === store_data[itm].name) {
                    checkName = true;
                    break;
                }
            }
            if (checkName) {
                callback({
                    ret: -1,
                    msg: "存在同名的模块，请检查！"
                });
                return;
            }

            // 新增
            store_data[mid] = {
                id: mid,
                name: name,
                params: {}
            }
            store.set(table_name, store_data);
            $(tplModule.replace(/\{id\}/g, mid).replace('{name}', name).replace('{active}', '')).appendTo($('#moduleList'));
            callback({
                ret: 0
            });

            // UI
            $('#moduleTips').hide();
        },


        /**
         * 删除模块
         * @param mid   模块的id
         */
        storeDel: function (mid) {
            store_data[mid] = null;
            delete store_data[mid];
            store.set(table_name, store_data);

            // UI
            $('a[data-id="' + mid + '"]').parent().remove();
            $('#moduleList').children().length === 0 ? $('#moduleTips').show() : null;

            // 如果删除的是当前在编辑的模块，则需要连同参数一起删除
            if (currMid === mid) {
                $('#parameterList').children().remove();
                $('#tips').show();
                currMid = null;
            }
        }

    };


    /**
     * 参数处理功能：包括新增参数、删除参数、更新参数三个接口
     * @type {{storeAdd: Function, storeDel: Function, storeUpdate: Function}}
     */
    var Parameter = {
        storeAdd: function () {
            var pid = 'p' + new Date().getTime();
            if (!store_data[currMid].params) {
                store_data[currMid].params = {};
            }
            store_data[currMid].params[pid] = {
                id: pid,
                key: '',
                val: ''
            };
            store.set(table_name, store_data);

            // UI
            $(tplParameter.replace('{#}', $('#parameterList').children().length + 1).replace('{key}', '').replace('{val}', '').replace(/\{mid\}/g, currMid).replace(/\{pid\}/g, pid)).appendTo($('#parameterList'));
            $("#tips").hide();
        },

        storeDel: function (mid, pid) {
            store_data[mid].params[pid] = null;
            delete store_data[mid].params[pid];
            store.set(table_name, store_data);

            // UI
            $('a[data-id="' + mid + '-' + pid + '"]').parent().parent().remove();

            // 如果参数都删除完，则需要显示暂无参数提示
            if ($('#parameterList').children().length === 0) {
                $('#tips').show();
            }
        },

        storeUpdate: function (mid, pid, itm, newVal) {
            store_data[mid].params[pid][itm] = newVal;
            store.set(table_name, store_data);
        }
    }


});
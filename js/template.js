// IE11用Polyfill
if (window.navigator.userAgent.indexOf('Trident') !== -1) {
	// Array.includes << from Mozilla Dev
	if (!Array.prototype.includes) {
		Object.defineProperty(Array.prototype, 'includes', {
			value: function(searchElement, fromIndex) {
				if (this == null) {
					throw new TypeError('"this" is null or not defined');
				}
				var o = Object(this);
				var len = o.length >>> 0;
				if (len === 0) {
					return false;
				}
				var n = fromIndex | 0;
				var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

				function sameValueZero(x, y) {
					return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
				}
				while (k < len) {
					if (sameValueZero(o[k], searchElement)) {
						return true;
					}
					k++;
				}
				return false;
			}
		});
	}

	// Object.values
	if (!Object.values) {
		Object.values = function(obj) {
			return Object.keys(obj).map(function(key) { return obj[key]; });
		}
	}
}

// JS:prevAll
function prevAll(node, selector) {
	var list = [];
	var prev = node.previousElementSibling;

	while (prev && prev.nodeType === 1) {
		list.unshift(prev);
		prev = prev.previousElementSibling;
	}

	if (selector) {
		var node = [].slice.call(document.querySelectorAll(selector));
		list = list.filter(function(item) {
			return node.indexOf(item) !== -1;
		});
	}

	return list;
}

// ブラウザ履歴ボタン制御
if (window.history && window.history.pushState) {
	// 
	history.pushState('nohb', null, location.pathname + location.hash);
	$(window).on('popstate', function(event) {
		if (!event.originalEvent.state) {
			history.pushState('nohb', null, location.pathname + location.hash);
			return;
		}
	});
}

// キーボードによるリフレッシュ禁止
document.onkeydown = lock_keys;
function lock_keys() {
	switch(event.keyCode) {
		case 116: // F5
		case 117: // F6
		case 123: // F12
			event.keyCode = 0;
			return false;
		case 76: // Ctrl + L
		case 82: // Ctrl + R
		case 87: // Ctrl + W
			if (event.ctrlKey) {
				event.keyCode = 0;
				return false;
			}
		break;
	}
}

var outai_template = function() {
	this.jsonData = '';
	this.menu_toggle = 0;
	this.active_tab_id = '';
	this.honkaku_score = 0;
	// メニュー項目格納用
	this.menu = '';
}

outai_template.prototype = {
	el: {
		$template	: document.getElementById('template'),
		$memo		: document.getElementById('memo'),
		$drawer		: document.getElementById('drawer'),
		$inb_memo	: document.getElementById('inb_memo'),
		$hearing	: document.getElementById('hearing'),
		$reload_btn	: document.getElementById('page_reload'),
		$shozoku_sel: document.getElementById('shozoku_sel'),
		$shozoku_free: document.getElementById('shozoku_free')
	},

	set_json_data: function() {
		var self = this;
		$.ajax({
			type: 'GET',
			url: './json/template_local.json',
			async: false,
			dataType: 'json'
		}).done(function(data) {
			self.jsonData = $.extend(true, data, {});
			self.menu = $.extend(true, data.menu, {});
			self.honkaku.koumoku = self.jsonData.honkaku;
			self.temps.data = JSON.stringify(self.jsonData.templates);
			console.log(self.temps.data);
			self.temps.data = JSON.parse(self.temps.data);
		}).fail(function() {
			alert('JSONファイルデータの記述を見直してください。');
		});
	},

	set_menu_list: function() {
		let menu = this.jsonData.menu;
		for (key in menu) {
			if (menu.hasOwnProperty(key)) {
				var li = '<li><a class="list-group-item" data-toggle="pill" href="' + 
							menu[key] + '">' + key + '</a></li>';
				this.el.$drawer.insertAdjacentHTML('beforeend', li);
			}
		}
	},

	// 使い回し用関数群
	commonFunc: {
		addListener: function(elm, ev, listener) {
			if (elm.addEventListener) {
				elm.addEventListener(ev, listener, false);
			} else if (elm.attachEvent) {
				elm.attachEvent('on' + ev, listener);
			} else {
				throw new Error('イベントリスナーに未対応です');
			}
		},

		cmdCopy: function(target) {
			target.focus();
			target.select();
			if (navigator.clipboard === undefined) {
				window.clipboarData.setData('Text', target.value);
			} else {
				navigator.clipboard.writeText(target.value);
			}
		},

		copySet: function(val) {
			if (val) {
				var ta = document.createElement('textarea');
				ta.id = 'for_copy';
				ta.value = val;
				ta.setAttribute('style', 'width: 0; height: 0; opacity: 0; position: fixed; top: 0;');
				document.body.appendChild(ta);
				this.cmdCopy(ta);
				document.body.removeChild(ta);
				return true;
			} else {
				return false;
			}
		},

		// 右側メニューアニメ
		drawer_anim: function(self) {
			var grayback = document.getElementById('gray_back');
			if (self.menu_toggle === 0) {
				grayback.style.height = '100vh';
				// メニュー表示アニメ
				self.el.$drawer.classList.add('menu-open');
				// 下レイヤーのスクロールを無効に
				$('html, body').css('overflow', 'hidden');
				self.menu_toggle = 1;
			} else {
				grayback.style.height = '0';
				// メニュー非表示アニメ
				self.el.$drawer.classList.remove('menu-open');
				// 下レイヤーのスクロールを無効に
				$('html, body').css('overflow', '');
				self.menu_toggle = 0;
			}
		},

		// テンプレコピーボタン設置
		set_footer_btn: function(id) {
			var cp_compact = '<div class="col-xs-4"><button class="btn btn-primary btn-block btn-sm" type="button" name="tmp_compact">入力項目テンプレ COPY</button></div>';
			var cp_whole = '<div class="col-xs-4"><button class="btn btn-primary btn-block btn-sm" type="button" name="tmp_whole">全項目テンプレ</button></div>';
			var cp_outai = '<div class="col-xs-4"><button class="btn btn-success btn-block btn-sm" type="button" name="outai_memo">応対メモ COPY</button></div>';

			var def = cp_compact + cp_outai + cp_whole;
			var kaden = cp_compact + '<div class="col-xs-4 col-xs-offset-4"><button class="btn btn-primary btn-block btn-sm" type="button" name="tmp_whole">全項目テンプレ</button></div><div class="clearfix"></div>';

			switch(id) {
				case '#kaden':
					return kaden;
				default:
					return def;
			}
		},

		// 自動で消えるメッセージボックス（アラート/ポップタイプ）
		msg_box: function(type, txt, time) {
			// typeはalert/popの2種類
			var box = document.getElementById(type + '_message');
			var msgDiv = box.firstElementChild;
			msgDiv.textContent = txt;
			$(box).show();
			$(box).fadeIn().queue(function() {
				setTimeout(function() {
					$(box).dequeue();
				}, time);
			});
			$(box).fadeOut();
		},

		// 入電者 聴取部分の高さ調節(window.onload/onresize, #memo_title.onclick)
		changeHearingH: function() {
			var self = outai_template.prototype;
			var innH = window.innerHeight;
			var innH_border = 720;
			if (innH < innH_border && self.el.$hearing.clientHeight > 0) {
				if (self.el.$memo.classList.contains('col-md-6')) {
					self.el.$inb_memo.style.height = 'calc(100vh - 496px)';
				} else {
					self.el.$inb_memo.classList.remove('collapsed_full');
					self.el.$inb_memo.removeAttribute('style');
				}
			}
			if (innH < innH_border && self.el.$hearing.clientHeight == 0) {
				self.el.$inb_memo.removeAttribute('style');
				if (self.el.$memo.classList.contains('col-md-6')) {
					self.el.$inb_memo.classList.remove('collapsed_full');
				} else {
					self.el.$inb_memo.classList.add('collapsed_full');
				}
			}
			if (innH >= innH_border && self.el.$hearing.clientHeight > 0) {
				self.el.$inb_memo.classList.remove('collapsed_full');
				if (self.el.$memo.classList.contains('col-md-6')) {
					self.el.$inb_memo.style.height = 'calc(100vh - 496px)';
				} else {
					self.el.$inb_memo.removeAttribute('style');
				}
			}
			if (innH >= innH_border && self.el.$hearing.clientHeight === 0) {
				self.el.$inb_memo.removeAttribute('style');
				if (self.el.$memo.classList.contains('col-md-6')) {
					self.el.$inb_memo.classList.remove('collapsed_full');
				} else {
					self.el.$inb_memo.classList.add('collapsed_full');
				}
			}
		},

		// テンプレタイプを選択したかどうかチェック。
		// テンプレ/応対メモコピーボタン押下時に最初に確認する。
		keyCheck: function(tab_id) {
			var key_targets = document.querySelectorAll('#' + tab_id + ' .panel-body [data-key]');
			key_targets = [].slice.call(key_targets);
			if (key_targets.length > 0) {
				var keySelect = [];
				for (var i = 0; i < key_targets.length; i++) {
					var type = key_targets[i].type || key_targets[i].tagName.toLowerCase();
					if (type === 'radio') {
						keySelect.push(key_targets[i].checked);
					}
				}
				var keyResult = keySelect.every(function(bool) { return !bool; });
				return keyResult;
			}
		},

		// 所属情報取得
		getActiveShozokuEl: function() {
			var self = outai_template.prototype;
			var shozokuEl = self.el.$shozoku_sel;
			if (shozokuEl.selectedIndex === 0) {
				shozokuEl = self.el.$shozoku_free;
			}
			return shozokuEl;
		},

		// 入電者情報とテンプレ側の入力項目（法人名、担当者名、連TEL）差異チェック
		value_diff: function(tabId, btnType, self) {
			// 表示されているタブ内で、for属性を持つbutton要素を取得
			var targets = document.querySelectorAll('#' + tabId + ' button[for]');
			// 入電者情報で聴取した Object
			var hearingObj = Object.create(null);

			// Nodelist -> Array
			targets = [].slice.call(targets);

			// 非表示(class="inactive")の要素を排除
			targets = targets.filter(function(el) {
				if (el.offsetWidth > 0) {
					var for_key = el.getAttribute('for');
					if (for_key === 'shozoku') {
						hearingObj[for_key] = self.commonFunc.getActiveShozokuEl().value;
					} else {
						hearingObj[for_key] = document.getElementById(for_key).value;
					}
					return el;
				}
			});

			/* forObjとtargetsをforで回して、drilldownで入力値を取り
			 * それらを比較。不一致を取り出してメッセージ化。
			 */
			var diffArr = [];
			var blankArr = [];
			for (var i = 0; i < targets.length; i++) {
				var data = self.logging.drilldown(targets[i].parentNode.parentNode, btnType);
				/**
				 * drilldownのreturn値が「〜様」で終わっている場合は削る。
				 * replaceで'様'を削らない。法人名/担当者名の途中で「様」が使われる可能性が微レ存。
				 * 下記の「様」を削る箇所でバグ有り。
				 */
				if (data && data.value.slice(-1) === '様' && data.title !== '担当部署') {
					data.value = data.value.slice(0, -1);
				}
				var for_key = targets[i].getAttribute('for');
				if (data.value === '') {
					blankArr.push('【' + data.title + '】');
				} else if (data.value !== hearingObj[for_key]) {
					diffArr.push('【' + data.title + '】');
				}
			}

			// 差異チェックの結果を返す。
			var result = Object.create(null);
			if (diffArr.length > 0) {
				result.bool = false;
				result.msg = '';
				result.msg += diffArr.join('／') + 'が不一致です。確認をお願いします。';
			} else {
				result.bool = true;
			}
			return result;
		},

		validate: function(self, tab_id) {
			/**
			 * 表示されたテンプレ内のバリデーションチェック
			 * 主キー[data-valid-key]とペアキー[data-valid-pair]が同値同士で入力/選択チェック
			 * 主キー要素に値があれば、ペアキー要素にも値の入力/選択が必須。
			 * 主キー要素に値無ければスルー。ペアキー要素は見ない。
			 */
			var result = Object.create(null);
			var v_keys = [].slice.call(
				document.querySelectorAll('#' + tab_id + ' [data-valid-key')
			)
			.filter(function(s) {
				return s.clientHeight > 0;
			});
			var v_subs = [].slice.call(
				document.querySelectorAll('#' + tab_id + ' [data-valid-subkey')
			).filter(function(s) {
				return s.clientHeight > 0;
			});

			var v_keys_arr = [];

			// 主キー要素が入力/選択されていなければ取得不要なので、
			// tmp_compactモードでdrilldown回す
			for (var i = 0, len = v_keys.length; i < len; i++) {
				var lastEl = self.logging.drilldown(v_keys[i], 'validate');
				if (lastEl) {
					if (!lastEl.value) {
						continue;
					}
					lastEl.valKey = v_keys[i].dataset.validKey || null;
					v_keys_arr.push(lastEl);
				}
			}

			// 回収すべき主キー要素が無ければ、エラーなしで返す
			if (!v_keys_arr.length) {
				result.bool = true;
				return result;
			}

			var v_subs_arr = [];
			for (var i = 0, len = v_subs_arr.length; i < len; i++) {
				var lastEl = self.logging.drilldown(v_subs[i], 'validate');
				if (lastEl) {
					lastEl.valSubkey = v_subs[i].dataset.validSubkey || null;
					v_subs_arr.push(lastEl);
				}
			}

			// keyに対するpair側に値が入っているかチェック
			var err_titles = [];
			for (var k in v_keys_arr) {
				for (var m in v_subs_arr) {
					if (v_keys_arr[k].valKey === v_subs_arr[m].valSubkey) {
						if (v_subs_arr[m].type && v_subs_arr[m].type === 'radio') {
							var res = v_subs_arr.some(function(v) {
								return !! v.value;
							});
							if (res) { continue; }
						}
						if (!v_subs_arr[m].value) {
							err_titles.push(v_subs_arr[m].title);
						}
					}
				}
			}

			// err_titles重複削除
			err_titles = err_titles.reduce(function(acc, item) {
				var res = acc.some(function(v) { return item === v; });
				if (!res) acc.push(item);
				return acc;
			}, []);

			// err_titles要素があれば返す
			if (err_titles.length) {
				result.bool = false;
				result.msg = err_titles.join('／') + 'が入力/選択されていません。';
			} else {
				result.bool = true;
			}
			return result;
		},

		// ハッシュ対応
		hashSync: function(self) {
			var hash = location.hash;

			if (hash) {
				$(document.querySelector('a.list-group-item[href="' + hash + '"]')).trigger('click');
				self.active_tab_id = hash.slice(1);
				var tabHeader = document.querySelector(hash + ' .panel-heading > h5');
				var key = tabHeader.dataset.key;
				self.logging.set_TabTitleKey[key];
			}
		},
	},

	// 特定要素向け関数
	etcFunc: {
		/**
		 * 解約、移転/継続テンプレの「建物解体」有無によって備考欄に
		 * 定形文言を追記/削除する。
		 */
		kaitaiY: function (e) {
			var common_name = e.name.slice(0, -6);
			var bikouEl = document.getElementById(common_name + 'bikou');
			if (!bikouEl) return false;

			var bikouVal = bikouEl.value;
			var targetN = e.dataset.targetName;
			var toggleTxt = '・設備撤去立会が希望日で承れない場合、お客さまへ連絡ある旨案内了承。\n';
			if (/_kaitai_y/.test(targetN)) {
				bikouEl.value = toggleTxt + bikouVal;
			} else {
				bikouEl.value = bikouVal.replace(toggleTxt, '');
			}
		}
	},

	logging: {
		make_log: function(tabId, arr, tmpCopy_type) {
			var tmp_type = tmpCopy_type;
			var logArr = [], log;
			var newL = (tmp_type === 'outai') ? '' : '\n';

			log = (tabId === 'kaden') ?
				'[ケース番号]の件CBす。●対話者：●●様●内容：架電先：【送客：未実施/OK/NG】' + newL :
				this.get_TabTitleKey() + newL;
			
			// 応対メモのヘッダーに応じて文言追記
			if (tmp_type === 'outai') {
				switch (log) {
					case '【営業対応依頼】':
					case '【お客さま対応依頼】':
						log += '　詳細は引継参照　';
						break;

					case '【契約者情報変更　対応依頼】':
						log += '　変更区分：（契約先＋請求先／契約先のみ）';
						break;

					case '【譲渡関連対応依頼】':
						log += '■譲渡の連絡有　';
						break;

					case '【お客さま対応依頼】':
						log += '■確認希望　別途担当より連絡する旨案内す　詳細は引継参照　';
						break;

					case '【契約検討】':
						log += '■見積希望　別途担当より連絡する旨案内す　詳細は引継参照　';
						break;

					default:
						// ヘッダーの前に「■」、後に全角スペースを入れておく
						log = '■' + log + '　';
						break;
				}
			}

			for (var i = 0, len = arr.length; i < len; i++) {
				var lastEl = this.drilldown(arr[i], tmp_type);
				if (lastEl) {
					if (lastEl.type === 'checkbox' && tmp_type === 'outai') {
						lastEl.value = lastEl.value.replace(/^\n・/g, '');
					}
					logArr.push(lastEl);
				}
			}

			// 入力項目テンプレCOPY => 値がある項目のみログ配列（logArr）に格納
			if (tmp_type === 'tmp_compact') {
				logArr = logArr.reduce(function(acc, curr) {
					if (!!curr.value) {
						acc.push(curr);
					}
					return acc;
				}, []);
			}

			/* 一時的にタイトルソート */
			if (tmp_type === 'outai') {
				logArr.sort(function(x, y) {
					if (x.title >= y.title) {
						return 1;
					}
					return -1;
				});
			}

			// logArr[n].titleが被った場合の対処（複数チェックボックスの場合など）
			logArr = logArr.reduce(function(acc, obj) {
				var lastTitle = (acc.length > 0) ? acc[acc.length-1].title : '';
				// 1個前の項目とタイトル被り無
				if (lastTitle !==- obj.title) {
					acc.push(obj);
					return acc;
				}

				// 1個前の項目とタイトル被り有
				switch (obj.title) {
					case '利用トーク':
					case '　変更項目':
						if (obj.value) {
							if (acc[acc.length - 1].value.length > 0) {
								acc[acc.length - 1].value += '、' + obj.value;
							} else {
								acc[acc.length - 1].value += obj.value;
							}
						}
						break;

					case '変更区分':
						if (obj.value)
							acc[acc.length - 1].value += obj.value;
						break;

					default:
						if (obj.value) {
							if (obj.type === 'checkbox' && tmp_type === 'outai') {
								acc[acc.length - 1].value += '、' + obj.value;
							} else {
								acc[acc.length - 1].value += obj.value;
							}
						}
						break;
				}
				return acc;
			}, []);

			/* outaiIndexソートに戻す */
			if (tmp_type === 'outai') {
				logArr.sort(function(x, y) {
					if (parseInt(x.outaiIndex) === parseInt(y.outaiIndex)) {
						return x.title.localeCompare(y.title, 'ja');
					}

					if (parseInt(x.outaiIndex) > parseInt(y.outaiIndex)) {
						return 1;
					}
					return -1;
				});
			}
			return {'log': log, 'logArr': logArr};
		},

		remake_log: function (log, logArr, tmpCopy_type) {
			// ログの最終成型
			var koumoku_h = '■', newL = '\n', sep = '：';
			if (tmpCopy_type === 'outai') koumoku_h = '';
			for (var i = 0, len = logArr.length; i < len; i++) {
				var title = (/◆/.test(logArr[i].title.substr(0, 1))) ?
							logArr[i].title + sep:
							koumoku_h + logArr[i].title + sep;
				var val = logArr[i].value;
				switch (title) {
					case '■利用トーク：':
						if (val)
							val = '○○' + val + '○○';
						break;

					case '■【郵送】':
					case '■【FAX】':
					case '　：':
						title = '';
						break;
				}

				log += title + val + newL;
			}
			return log.slice(0, -1); // 最後の改行を削る
		},

		set_TabTitleKey: function(val) {
			this.active_tab_log_title = val;
		},

		get_TabTitleKey: function() {
			return this.active_tab_log_title;
		},

		drilldown: function (arr, tmpCopy_type) {
			var el = arr;
			if (tmpCopy_type === 'outai')
				el = arr.el;
			
			var log_type = el.dataset.log;
			/**
			 * log_type: force	=> 非表示でも強制取得
			 * log_type: normal	=> 非表示なら取得せず
			 * log_type: none	=> 表示/非表示でも取得せず
			 */

			//  log_type: none でも「応対メモ」は取得対象とする処置
			if (log_type === 'none' && tmpCopy_type !== 'outai') return false;

			var clear_fix = (el.className === 'clearfix') ? true : false;
			if (clear_fix) return false;

			var koumoku_el = el.parentNode.previousElementSibling;
			// 項目名に補足があるのは大抵<span>で括られているので除去
			var koumoku_title = arr.koumoku_title || koumoku_el.innerHTML.split('<span>')[0];
			// <br />などのHTMLタグも除去
			koumoku_title = koumoku_title.replace(/(".*?"|'.*?'|[^'"])*?\>/, '');

			if (el.classList.contains('input-group')) {
				// input-group用のパターン
				var groupLog = this.getInputGroupData(el, tmpCopy_type, koumoku_title);
				return groupLog;
			}

			var partLog = this.getPartLogData(el, tmpCopy_type, koumoku_title);
			return partLog;
		},

		getInputGroupData: function (el, tmpCopy_type, title) {
			var data = Object.create(null);
			data = {
				title: title,
				value: '',
				outaiIndex: el.dataset.outaiIndex
			}
			for (var i = 0, len = el.childNodes.length; i < len; i++) {
				var child = el.childNodes[i];
				if (child.classList.contains('input-group-btn')) {
					continue;
				}
				/* 入電者：「〜様」対策する */
				if (child.classList.contains('input-group-addon')) {
					switch (child.textContent) {
						case '〒':
							data.value += '\n' + child.textContent;
							break;
						case '様':
						case 'A':
						case '名ほど':
						case '箇所':
							data.value += child.textContent;
							break;
						default:
							data.value += '\n' + child.textContent + '：';
					}
				} else {
					if (!child.value && tmpCopy_type === 'tmp_compact') {
						return false;
					}
					data.value += child.value;
				}
			}
			return data;
		},

		getPartLogData: function (el, tmpCopy_type, title) {

			// JSONのoutaiIndex値
			var index = el.dataset.outaiIndex || null;
			// 応対テンプレ用変数（JSONでoutaiValueセットした場合）
			var defValue = el.dataset.outaiValue ? el.dataset.outaiValue : false;

			while (el.childNodes.length) {
				/**
				 * el.id が cal_〜開始の場合、
				 * firstChildのchildNodes[1]が日付入力部分に当たるので
				 * それを取得するように細工する。
				 */
				if (/^cal_/.test(el.id)) {
					el = el.firstChild.childNodes[1];
				} else {
					el = el.childNodes[0];
				}
			}

			/* 各テンプレ冒頭にある、パターンを選択するモノか */
			if (!!el.dataset &&  !!el.dataset.key) {
				if (!el.dataset.validKey && tmpCopy_type !== 'validate') {
					return false;
				}
			}

			var tagName = el.tagName ? el.tagName.toLowerCase() : el.parentNode.tagName.toLowerCase();
			var data = Object.create(null);

			if (!!index) {
				data.outaiIndex = index;
			}

			switch (tagName) {
				case 'input':
					if (el.type === 'text') {
						data['title'] = title;
						data['type'] = el.type;
						data['value'] = defValue ? defValue : el.value;
						return data;
					}
					if (el.type === 'radio') {
						if (el.checked == true || tmpCopy_type !== 'tmp_compact') {
							var toggleData;
							if (el.dataset.disableToggle === 'true' && el.parentNode.nextElementSibling) {
								toggleData = el.parentNode.nextElementSibling.value;
							}
							data['title'] = title;
							data['type'] = el.type;
							data['name'] = el.name;
							data['checked'] = el.checked;
							data['value'] = !!toggleData ?
										el.parentNode.textContent + '\n' + toggleData :
										el.parentNode.textContent;
							// 全項目テンプレ＆ラジオボタン選択なしの場合、data['value']を上書き
							if (el.checked == false && tmpCopy_type !== 'tmp_compact') {
								data['value'] = '';
							}
							// ラジオボタン選択済 && デフォルト値ある場合
							if (el.checked && defValue) data['value'] = defValue;
							return data;
						}
					}
					if (el.type === 'checkbox') {
						var status = '';
						if (el.parentNode.parentNode.dataset.must === 'true' && el.checked) {
							status = '【案内済】';
						}
						if (el.parentNode.parentNode.dataset.must === 'true' && !el.checked) {
							status = '【未案内】';
						}

						if (el.checked || status || tmpCopy_type !== 'tmp_compact') {
							data['title'] = title;
							data['type'] = el.type;
							data['name'] = el.name;
							data['checked'] = el.checked;
							var toggleData = '';
							if (el.dataset.disableToggle === 'true' && el.parentNode.nextElementSibling) {
								toggleData = el.parentNode.nextElementSibling.textContent.replace(
									/【案内したらチェック】/, ''
								) || el.parentNode.nextElementSibling.value;
							}
							var label = el.parentNode.textContent;
							switch (title) {
								case '利用トーク':
									data['value'] = label.slice(0, 1);
									break;
								
								case '変更区分':
									data['value'] = !!toggleData ?
										'\n●' + label + status + ':' + toggleData :
										'\n●' + label + status;
									break;

								case '変更項目':
									if (tmpCopy_type === 'outai') {
										data['title'] = '　' + title;
										data['value'] = label.replace(/【案内したらチェック】/, '');
									}
									break;

								default:
									data['value'] = !!toggleData ?
										'\n●' + label.replace(/【案内したらチェック】/, '') + status + '\n' + toggleData :
										'\n●' + label.replace(/【案内したらチェック】/, '') + status;
							}
							// 全項目テンプレ & チェックボタン選択なしの場合、data['value']を上書き
							if (!status && el.checked == false && tmpCopy_type !== 'tmp_compact') {
								data['value'] = '';
							}
							return data;
						}
					}
					return false;

				case 'option':
					var selbox = el.parentNode.parentNode;
					var selInd = selbox.selectedIndex;
					if (selInd != 0) {
						data['title'] = title;
						data['value'] = selbox.value;
						return data;
					}
					if (selInd == 0 && tmpCopy_type !== 'tmp_compact') {
						data['title'] = title;
						data['value'] = '';
						return data;
					}
					return false;

				default:
					data['tag'] = tagName;
					data['title'] = title;
					data['value'] = !!el.parentNode.value ? el.parentNode.value : '';

					return data;
			}
		}
	},

	setEvent: function () {
		var self = this;
		// 特定ボタン押下時の処理
		var button_fn = function (e) {
			var btnId_Name = e.target.id || e.target.name;
			switch (btnId_Name) {
				case 'copy':
				case 'honkaku_cp_btn':
				case 'ac1_btn':
				case 'ac2_btn':
				case 'ac3_btn':
				case 'ac4_btn':
					var target = $(this).closest('div.input-group').find('input:text');
					var copyResult = self.commonFunc.cmdCopy(target[0]);
					if (copyResult) {
						self.commonFunc.msg_box('pop', 'コピーしました。', 1000);
					} else {
						self.commonFunc.msg_box('alert', '入力/選択データがありません。', 1000);
					}
					break;

				case 'shozoku_cp':
					var shozokuEl = self.commonFunc.getActiveShozokuEl();
					var copyResult = self.commonFunc.copySet(shozokuEl.value);
					if (copyResult) {
						self.commonFunc.msg_box('pop', '所属をコピーしました。', 1000);
					} else {
						self.commonFunc.msg_box('alert', '入力/選択データがありません。', 1000);
					}
					break;

				case 'paste':
					var target = $(this).closest('div.input-group').find('input:text');
					var for_id = this.getAttribute('for');
					var forEl = document.getElementById(for_id);
					// コピー元が「入電者情報：所属」の場合、select項目かフリー入力のinput:textどちらかの値を貼付。
					if (for_id === 'shozoku') {
						forEl = self.commonFunc.getActiveShozokuEl();
					}
					target[0].value = forEl.value;
					break;

				case 'inb_memo_btn':
					self.commonFunc.cmdCopy(self.el.$inb_memo);
					self.commonFunc.msg_box('pop', '受付メモをコピーしました。', 1000);
					break;

				case 'inbound_cp_btn':
					/* 入電者情報コピーボタン */
					var inb_index = $('#hearing input:radio[name=inbound_info]:checked').parent().index();
					var honkaku_val = self.honkaku.retResultValue(inb_index);
					var tantou = document.getElementById('tantou_name');
					var inb_radio = document.querySelector('input[name=inbound_info]:checked');
					var gen_radio = document.querySelector('input[name=inbound_gender]:checked');
					var shozoku_el = self.commonFunc.getActiveShozokuEl();
					if (!honkaku_val || !inb_radio || !gen_radio) {
						// 本確結果、入電者、性別が選択されていないのでアラート出す
						self.commonFunc.msg_box('alert', '入電者/性別が選択されていません。', 1000);
					} else {
						// 最低限の項目を聴取済みなので処理続行
						var log = '';
						log += inb_radio.value + gen_radio.value + '／' + shozoku_el.value + '／' + tantou.value + '様' + honkaku_val;
						self.commonFunc.copySet(log);
						self.commonFunc.msg_box('pop', '入電者情報をコピーしました。', 1000);
					}
					break;

				case 'menu_btn':
				case 'gray_back':
					self.commonFunc.drawer_anim(self);
					break;
				
				case 'honkaku_parts01_reset':
				case 'honkaku_parts02_reset':
				case 'honkaku_parts03_reset':
				case 'honkaku_parts04_reset':
					// parts reset 処理
					var parts = btnId_Name.split('_reset')[0];
					var inputs = document.querySelectorAll('#honkaku input[name^='+parts+']:checked');
					for (var i = 0; i < inputs.length; i++) {
						inputs[i].checked = false;
					}
					self.honkaku.setScoreBarVal(self.honkaku.getCheckEl());
					break;

				case 'honkaku_all_reset':
					// all reset処理
					var inputs = document.querySelectorAll('#honkaku input:checked');
					for (var i = 0; i < inputs.length; i++) {
						inputs[i].checked = false;
					}
					self.honkaku.setScoreBarVal(self.honkaku.getCheckEl());
					break;

				case 'honkaku_return':
				case 'inbound_info':
					var resultInput = document.getElementById('honkaku_input');
					var index = $('#hearing input:radio[name=inbound_info]:checked').parent().index();
					resultInput.value = self.honkaku.retResultValue(index);
					break;

				case 'reset_ok':
					window.location.href = location.href.split('#')[0];
					break;

				case 'tmp_compact':
				case 'tmp_whole': {
					var tab_id = self.active_tab_id;
					// 各テンプレ内のタイプ別ラジオボタン選択有無
					var keyResult = self.commonFunc.keyCheck(tab_id);
					if (keyResult) {
						self.commonFunc.msg_box('alert', 'テンプレタイプが選択されていません。', 1000);
						break;
					}

					// 入電者情報とテンプレ側の入力項目（法人名、担当者名、連TEL）差異チェック結果
					var obj_diff_check = self.commonFunc.value_diff(tab_id, 'tmo_whole', self);
					if (!obj_diff_check.bool) {
						self.commonFunc.msg_box('alert', obj_diff_check.msg, 1000);
						break;
					}

					// バリデーションチェック
					var valid_result = self.commonFunc.validate(self, tab_id);
					if (!valid_result.bool) {
						self.commonFunc.msg_box('alert', valid_result.msg, 1000);
						break;
					}

					/* Nodelist -> Array */
					var log_targets = document.querySelectorAll('#' + tab_id + ' [data-log]');
					log_targets = [].slice.call(log_targets);
					/* :visible or data-log="force" pickup */
					log_targets = log_targets.filter(function(el) {
						if (el.offsetWidth > 0 || el.dataset.log === 'force') {
							var obj = {
								'koumoku_title': $(el).closest('td').prev().text(),
								'el': el
							};
							return obj;
						}
					});
					// 必要に応じて抽出・フィルタリング
					var pre_log = self.logging.make_log(tab_id, log_targets, btnId_Name);
					var log = self.logging.remake_log(pre_log.log, pre_log.logArr, btnId_Name);

					self.commonFunc.copySet(log);
					var cp_msg = (btnId_Name === 'tmp_compact') ?
								'入力済テンプレをコピーしました。':
								'全項目テンプレをコピーしました。';
					self.commonFunc.msg('pop', cp_msg, 1000);
					break;
				}

				case 'outai_memo': {
					var tab_id = self.active_tab_id;
					var keyResult = self.commonFunc.keyCheck(tab_id);
					if (keyResult) {
						self.commonFunc.msg_box('alert', 'テンプレタイプが選択されていません。', 1000);
						break;
					}

					var log_targets = document.querySelectorAll('#' + tab_id + ' [data-outai-index]');
					var log_arr = [].slice.call(log_targets);

					var new_log_arr = [];
					for (var el in log_arr) {
						if (log_arr[el].offsetWidth > 0 || log_arr[el].dataset.log === 'force') {
							var title = log_arr[el].dataset.outaiTitle ?
										log_arr[el].dataset.outaiTitle :
										$(log_arr[el]).closest('td').prev().text();
							var log_index = log_arr[el].dataset.outaiIndex;
							var log_value = log_arr[el].dataset.outaiValue ?
										log_arr[el].dataset.outaiValue :
										false;

							var obj = {
								'log_index': log_index,
								'koumoku_title': title,
								'el': log_arr[el]
							};
							if (log_value) obj['log_value'] = log_value;
							new_log_arr.push(obj);
						}
					}
					/* new_log_targetsを log_indexでソートし直し */
					new_log_arr.sort(function(x, y) {
						if (parseInt(x.log_index) >= parseInt(y.log_index)) {
							return 1;
						}
						return -1;
					});

					// 必要に応じて抽出・フィルタリング
					var pre_log = self.logging.make_log(tab_id, new_log_arr, 'outai');
					var log = self.logging.remake_log(pre_log.log, pre_log.logArr, 'outai');
					log = log.replace(/\n/g, '　');
					self.commonFunc.copySet(log);
					self.commonFunc.msg_box('pop', '応対メモをコピーしました。', 1000);
				}

				case 'kic_log_btn': {
					var kic_log = '';
					var gori_app_rad = document.querySelector('input[type="radio"][name="gori_app"]:checked');
					var gori_app_sel = document.getElementById('gori_app_sel').value;
					// ご利カス/アプリ勧奨有無
					if (gori_app_rad && gori_app_rad.value == 1) {
						kic_log += '【ご利/アプリ勧奨】' + gori_app_rad.nextSibling.nodeValue + '○○'
					}
					if (gori_app_rad && gori_app_rad.value == 0) {
						kic_log += '【ご利/アプリ勧奨】' + gori_app_rad.nextElementSibling.nodeValue + '：' + gori_app_sel + '○○';
					}

					if (kic_log) {
						self.commonFunc.copySet(kic_log);
						self.commonFunc.msg_box('pop', 'KIC用ログをコピーしました。', 1000);
					} else {
						self.commonFunc.msg_box('alert', '項目を選択してください。', 1000);
					}
					break;
				}

				case 'kyoten_uke_desk_plus':
					var count = parseInt(e.target.dataset.counter);

					for (var i = 1; i <= count; i++) {
						var targetName = e.target.id + '_' + i;
						var targetTr = document.querySelectorAll('#template #kyoten tr[name="' + targetName + '"]');
						for (var m = 0; m < targetTr.length; m++) {
							targetTr[m].classList.remove('inactive');
						}
					}
					count++;
					if (count == 5) break;

					e.target.dataset.counter = count;
					break;

				default:
					break;
			}
		};

		// 法人名/屋号入力欄ペーストイベント
		document.querySelector('#corp_name').addEventListener('paste', function(ev) {
			var tmpVal = '';
			tmpVal = (ev.clipboarData || window.clipboarData).getData('text');
			tmpVal = tmpVal.replace(/\r?\n/g, '');
			this.value = tmpVal;
			ev.preventDefault();
		});

		/* 入電者：契約者/請求者/第三者 選択時のテキスト切り替え */ 
		{
			var inb_info_radio = document.querySelectorAll('#hearing inmput[name=inbound_info]');
			for (var i = 0; i < inb_info_radio.length; i++) {
				self.commonFunc.addListener(inb_info_radio[i], 'change', button_fn);
			}
		}

		// input:text, textareaでEsc押されたら入力内容クリアされる対処
		{
			var inputsAll = document.querySelectorAll('input[type=text], textarea');
			var escEsc = function(e) {
				if (e.keyCode == 27) {
					e.target.blur();
					e.target.focus();
				}
			};
			for (var i = 0, len = inputsAll.length; i < len; i++) {
				self.commonFunc.addListener(inputsAll[i], 'keydown', escEsc);
			}
		}

		/* radioボタンchangeによる、next要素のdisabled切替 */ {
			var toggleDisable = function() {
				var elem = this, el;
				var radio_name = elem.name;
				var pDiv = $(elem).closest('div')[0];
				var boolMemo = /col/.test(pDiv.className);
				if (elem.type === 'radio') {
					if (boolMemo) {
						el = document.querySelectorAll('input[type="radio"][name="' + radio_name + '"]');
					} else {
						el = document.querySelectorAll('#template #' + self.active_tab_id + ' input[type="radio"][name="' + radio_name + '"]');
					}
				} else if (elem.type === 'checkbox') {
					el = document.querySelectorAll('#template #' + self.active_tab_id + ' input[type="checkbox"]');
				}
				for (var i = 0; i < el.length; i++) {
					var target = boolMemo ?
							el[i].parentNode.parentNode.nextElementSibling.childNodes[1] :
							el[i].parentNode.nextElementSibling;
					if (target) {
						target.disabled = (function(t) {
							if (t.checked) {
								return false;
							} else {
								return true;
							}
						})(el[i]);
					}
				}
			};
		}

		/* radioボタンdisabledトグル用Element */ {
			var radioToggleDis = document.querySelectorAll('input[type="radio"][data-disable-toggle]');
			radioToggleDis = [].slice.call(radioToggleDis);
			var radioToggleDisName = radioToggleDis.map(function(el) { return el.name; });
			radioToggleDisName = radioToggleDisName.filter(function(x, i, self) {
				return self.indexOf(x) === i;
			});
			for (var i = 0; i < radioToggleDis.length; i++) {
				self.commonFunc.addListener(radioToggleDis[i], 'change', toggleDisable);
			}
		}
		

		/* checkbox on/offによる next要素のdisabled切替 */ {
			var chkToggleDis = document.querySelectorAll('input[type="checkbox"][data-disable-toggle]');
			chkToggleDis = [].slice.call(chkToggleDis);
			for (var i = 0; i < chkToggleDis.length; i++) {
				self.commonFunc.addListener(chkToggleDis[i], 'change', toggleDisable);
			}
		}

		/* select/option:selectedIndex == 0 でnext要素のdisabled切替 */ {
			var selToggleDis = function() {
				var selIndex = this.selectedIndex;
				var targetId = this.dataset.toggleTarget;
				var targetEl = doucment.getElementById(targetId);
				if (selIndex === 0) {
					targetEl.disabled = false;
				} else {
					targetEl.disabled = true;
				}
			};
			var selectToggle = document.querySelectorAll('select[data-toggle-target]');
			selectToggle = [].slice.call(selectToggle);
			for (var i = 0; i < selectToggle.length; i++) {
				self.commonFunc.addListener(selectToggle[i], 'change', selToggleDis);
			}
		}

		// メニューボタン押下時の関数
		var menu_fn = function(e) {
			var tabId = e.target.getAttribute('href');
			self.active_tab_id = tabId.slice(1);
			self.commonFunc.drawer_anim(self);
			var tabHeader = document.querySelector(tabId + ' .panel-heading > h5');
			var key = tabHeader.dataset.key;
			self.logging.set_TabTitleKey(key);

			// アドレスにハッシュ付与
			document.location.hash = tabId;
			e.preventDefault();
		};
		// メニュー項目（#drawer .list-group-item）
		var menuLists = document.querySelectorAll('#drawer .list-group-item');
		for (var i = 0; i < menuLists.length; i++) {
			self.commonFunc.addListener(menuLists[i], 'click', menu_fn);
		}

		// clickListener for button
		var btns = document.getElementsByTagName('button');
		for (var i = 0; i < btns.length; i++) {
			self.commonFunc.addListener(btns[i], 'click', button_fn);
		}
		// #gray_back
		self.commonFunc.addListener(document.getElementById('gray_back'), 'click', button_fn);

		/**
		 * 本人確認モーダルを「決定」押下せず、モーダル背景クリックで閉じた場合。
		 * trigger()で「決定」ボタン押下と同じように振る舞わせる。
		 */
		$('#honkaku').on('hidden.bs.modal', function() {
			var hon_ret = document.getElementById('honkaku_return');
			$(hon_ret).trigger('click');
		});

		/* honkaku_inputs */ {
			var inputEls = document.querySelectorAll('#honkaku input');
			for (var i = 0; i < inputEls.length; i++) {
				self.commonFunc.addListener(
					inputEls[i],
					'change',
					function() {
						self.honkaku.getCheckEl();
						self.honkaku.setScoreBarVal(self.honkaku.getScore());
					}
				);
			}
		}

		// input:focus, blur
		{
			var inputs = document.querySelectorAll('input[type=text], textarea');
			for (var i = 0; i < inputs.length; i++) {
				self.commonFunc.addListener(inputs[i], 'focus', function() {
					this.classList.add('focus');
				});
				self.commonFunc.addListener(inputs[i], 'blur', function() {
					this.classList.remove('focus');
				});
			}
		}

		// 受付メモ文字数カウント
		var countMemo = function() {
			var memo_max = 255;
			var $memoCounter = document.querySelector('div.list-group span.counter');
			$memoCounter.textContent = this.value.length;
			if (this.value.length > memo_max) {
				$memoCounter.classList.add('red');
			} else {
				$memoCounter.classList.remove('red');
			}
		};
		self.commonFunc.addListener(self.el.$inb_memo, 'input', countMemo);

		// #memo collapseで受付メモtextarea add/remove class
		$('#memo_title').on('click', function() {
			$('#hearing').toggle();
			$(self.el.$inb_memo).toggleClass('collapsed');
			self.commonFunc.changeHearingH();
		});

		/* 受付メモ最大化/通情化ボタン */ {
			var $memo_resize = document.getElementById('memo_resize');
			var memo_fullsize = function() {
				self.el.$template.classList.add('inactive');
				self.el.$memo.classList.remove('col-md-6');
				self.el.$memo.classList.add('full');
				self.el.$memo.style.position = '';
				self.el.$reload_btn.classList.remove('col-md-6');
				self.el.$reload_btn.style.position = '';
				$memo_resize.classList.remove('glyphicon-resize-full');
				$memo_resize.classList.add('glyphicon-resize-small');
				$memo_resize.dataset.originalTitle = '元の大きさに戻す';
			};
			var memo_neutral = function () {
				self.el.$template.classList.remove('inactive');
				self.el.$memo.classList.remove('full');
				self.el.$memo.classList.add('col-md-6');
				self.el.$memo.style.position = 'relative';
				self.el.$reload_btn.classList.add('col-md-6');
				self.el.$reload_btn.style.position = '';
				$memo_resize.classList.add('glyphicon-resize-full');
				$memo_resize.classList.remove('glyphicon-resize-small');
				$memo_resize.dataset.originalTitle = '受付メモ最大化';
			};
			self.commonFunc.addListener($memo_resize, 'click', function() {
				var hasResizeFull = this.classList.contains('glyphicon-resize-full');
				hasResizeFull ? memo_fullsize() : memo_neutral();
				self.commonFunc.changeHearingH();
			});
		}

		/* ラジオボタンで表示切り替え */ {
			var toggleRadios = document.querySelectorAll('#template th.choose + td input[type=radio]');
			toggleRadios = [].slice.call(toggleRadios);
			var toggleRadioNames = toggleRadios.map(function (el) { return el.name; });
			toggleRadioNames = toggleRadioNames.filter(function(x, i, self) {
				return self.indexOf(x) === i;
			});
			for (var i = 0; i < toggleRadios.length; i++) {
				self.commonFunc.addListener(toggleRadios[i], 'change', function() {
					var common_name = this.name;
					var target = this.dataset.targetName;
					// [name^={common_name}_]の要素を抽出(trやtd内ブロック単位)
					var targetEls = document.querySelectorAll('#template [name^=' + common_name + ']:not(input)');
					targetEls = [].slice.call(targetEls);
					trToggle(common_name, target, targetEls);

					// 各テンプレ内のタイプ切替ラジオボタンの場合
					if (this.dataset.key) {
						var innText = this.nextSibling.textContent;
						if (innText) {
							self.temps.create_panel.change_headerData(self, self.active_tab_id, innText, this.dataset.key);
						}
						/**
						 * 表示テンプレ内input:radioで、属性[data-target-name]:有
						 * 且つ[data-key]:無の要素のチェックされた状態を解除する
						 */
						var checkedRadio = document.querySelectorAll('#template #' + self.active_tab_id + ' input[type="radio"][data-target-name]:not([data-key]):checked');
						checkedRadio = [].slice.call(checkedRadio);
						for (var k in checkedRadio) {
							if (checkedRadio[k].name !== 'kaiyaku_base_supp' && checkedRadio[k].name !== 'kaiyaku_uke') {
								checkedRadio[k].checked = false;
							}
						}
					}

					// 建物解体[Y]選択時の備考欄
					if (/_kaitai/.test(common_name)) { self.etcFunc.kaitaiY(this); }
				});
			}
		}

		// select[data-option-toggle=true]は、option:selectedIndexによってtrトグル
		var toggleSelect = {
			targetEls: (function() {
				var el = document.querySelectorAll('#template th.choose + td select[data-option-toggle="true"]');
				el = [].slice.call(el);
				return el;
			})(),
			event: function() {
				for (var i = 0; i < this.targetEls.length; i++) {
					self.commonFunc.addListener(this.targetEls[i], 'change', function() {
						var common_name = this.name;
						var target = common_name + '_' + this.selectedIndex;
						// [name^={common_name}_]の要素を抽出（trやtd内ブロック単位）
						var targetEls = document.querySelectorAll('#template [name^=' + common_name + '_]:not(input)');
						targetEl = [].slice.call(targetEls);
						trToggle(common_name, target, targetEls);
						var sel_value = this.selectedIndex === 0 ? '' : this.value;
						// select:optionのvalue値をテンプレのkey値に
						self.temps.create_panel.change_headerData(self, self.active_tab_id, sel_value, sel_value);
					});
				}
			},
			init: function() {
				this.event();
			}
		}
		toggleSelect.init();

		// 各テンプレ用のtrトグル関数（radio/select:option切替対応）
		function trToggle(common_name, target, targetEls) {
			// trトグル
			for (var i = 0, len = targetEls.length; i < len; i++) {
				targetEls[i].classList.add('inactive');
				if (targetEls[i].attributes.name.nodeValue === target || targetEls[i].attributes.name.nodeValue === (common_name + "_common")) {
					targetEls[i].classList.remove('inactive');
				}
			}
			// ネストラジオボタンのチェック外す
			var nestRadio = document.querySelectorAll('#template #' + self.active_tab_id + ' input[type="radio"][name^=' + common_name + '_]');
			if (nestRadio.length === 0) return false;
			nestRadio = [].slice.call(nestRadio);
			for (var k in nestRadio) {
				nestRadio[k].checked = false;
			}
		}

		// select[id^=select_supp] 電力会社別、契約種別項目表示
		var supp_plan = {
			targetEls: (function() {
				return document.querySelectorAll('#template select[id^="select_supp"]');
			})(),
			supp: ['北海道電力', '東北電力', '東京電力', '中部電力', '北陸電力', '九州電力'],
			planBC: ['従量電灯B', '従量電灯C', '低圧電力', '従量電灯B+低圧電力', '従量電灯C+低圧電力'],
			planAB: ['従量電灯A', '従量電灯B', '低圧電力', '従量電灯A+低圧電力', '従量電灯B+低圧電力'],
			event: function() {
				var self = this;
				for (var i = 0; i < self.targetEls.length; i++) {
					self.targetEls[i].addEventListener('change', function() {
						var ind = this.selectedIndex;
						var opt = this.options;
						self.set_plan(this, ind, opt[ind].textContent);
					});
				}
			},
			set_plan: function(select, ind, val) {
				var select_plan = document.getElementById(select.getAttribute('for'));
				if (!select_plan) return false;
				var options = select_plan.children;
				options = [].slice.call(options);
				// 一旦、契約種別のindex:0より後ろをクリア
				for (var i = 0, len = options.length; i < len; i++) {
					select_plan.removeChild(options[i]);
				}
				// index:0でもfalse返す
				if (ind === 0) return false;

				// 従量電灯B・Cの電力会社か判別
				if (this.supp.includes(val)) {
					self.temps.add_option(this.planBC, select_plan);
				} else {
					self.temps.add_option(this.planAB, select_plan);
				}
			},
			init: function() {
				this.event();
			}
		}
		supp_plan.init();

		/**
		 * 入電者情報：会社名、担当者名、所属、連TELを入力し、
		 * カーソル外れたら(blur)テンプレ側の当該項目にも自動反映させる。
		 * 先にテンプレ側に入力済の値があれば、反映はスルー。
		 */
		var auto_input = {
			targets: Object.create(null),
			init: function() {
				var that = this;
				var baseEl = document.querySelectorAll('#corp_name, #tantou_name, #inbound_tel, #shozoku_free');
				baseEl = [].slice.call(baseEl);
				for (var k in baseEl) {
					that.targets[baseEl[k].id] = document.querySelectorAll('#template button[for=' + baseEl[k].id + ']');
					baseEl[k].onblur = function() {
						var baseVal = this.value;
						that.fillText(that.targets[this.id], baseVal);
					};
				}
			},
			fillText: function(targets, baseVal) {
				targets = [].slice.call(targets);
				for (var k in targets) {
					var targetInput = prevAll(targets[k].parentNode, 'input[type=text]')[0];
					if (targetInput.value === '') {
						targetInput.value = baseVal;
					}
				}
			}
		};
		auto_input.init();

		// ツールチップ表示fn
		$('[data-toggle="tooltip"]').tooltip();

		window.onresize = this.commonFunc.changeHearingH;
	},

	// 本人確認パーツ
	honkaku: {
		koumoku: "",
		score: 0,
		selArr: [],
		init: function() {
			this.makeKoumoku();
		},
		makeKoumoku: function() {
			var self = this;
			var create_tr = function(key, n) {
				var base = document.querySelector('#honkaku tr.' + key);
				while(n > 0) {
					base = base.nextElementSibling;
					n--;
				}
				var el = document.createElement('tr');
				if (base.classList.contains('odd')) {
					el.classList.add('odd');
				} else {
					el.classList.add('even');
				}
				base.insertAdjacentElement('afterend', el);
				return el;
			};
			var create_td_radio = function(key, label, val, points) {
				var key = 'honkaku_' + key;
				var el = document.createElement('td');
				el.appendChild(document.createElement('label'));
				el.firstChild.classList.add('radio-inline');
				el.firstChild.appendChild(document.createElement('input'));
				var inputEl = el.firstChild.firstChild;
				inputEl.type = 'radio';
				inputEl.name = key;
				inputEl.value = val;
				inputEl.dataset.points = points;
				el.firstChild.insertAdjacentHTML('beforeend', label);
				return el;
			};
			var create_td_checkbox = function(key, label, val, points) {
				var key = 'honkaku_' + key;
				var el = document.createElement('td');
				el.appendChild(document.createElement('div'));
				el.firstChild.classList.add('checkbox');
				el.firstChild.appendChild(document.createElement('label'));
				el.firstChild.firstChild.appendChild(document.createElement('input'));
				var inputEl = el.firstChild.firstChild.firstChild;
				inputEl.type = 'checkbox';
				inputEl.name = key;
				inputEl.value = val;
				inputEl.dataset.points = points;
				el.firstChild.firstChild.insertAdjacentHTML('beforeend', label);
				return el;
			};
			var create_td_blank = function() {
				var el = document.createElement('td');
				el.insertAdjacentHTML('afterbegin', '&nbsp;');
				return el;
			};
			for (var key in self.koumoku) {
				if (self.koumoku.hasOwnProperty(key)) {
					inner_val(key);
				}
			}
			function inner_val(firstKey) {
				var trEl = create_tr(firstKey, 0);
				var keyLen = self.koumoku[firstKey].length;
				for (var i = 0; i < keyLen; i++) {
					if (i % 3 == 0 && i / 3 > 0) {
						trEl = create_tr(firstKey, i/3);
					}
					var values = self.koumoku[firstKey][i];
					if (firstKey === 'parts03') {
						var tdEl = create_td_checkbox(firstKey, values.label, values.value, values.points);
						trEl.appendChild(tdEl);
					} else {
						var tdEl = create_td_radio(firstKey, values.label, values.value, values.points);
						trEl.appendChild(tdEl);
					}
					if (i % 3 != 2 && i == (keyLen - 1)) {
						var gap = 2 - (i % 3);
						while(gap > 0) {
							var tdEl = create_td_blank();
							trEl.appendChild(tdEl);
							gap--;
						}
					}
				}
			}
		},
		getCheckEl: function() {
			var score = 0;
			var $honkaku = document.getElementById('honkaku');
			var els = $honkaku.querySelectorAll('input:checked');
			var p01 = $honkaku.querySelectorAll('input[name$="_parts01"]');
			var p02 = $honkaku.querySelectorAll('input[name$="_parts02"]');
			var p03 = $honkaku.querySelectorAll('input[name$="_parts03"]');
			var p03c = $honkaku.querySelectorAll('input[name$="_parts03"]:checked');
			var p03nc = $honkaku.querySelectorAll('input[name$="_parts03"]:not(:checked)');
			var p04 = $honkaku.querySelectorAll('input[name$="_parts04"]');
			var p04c = $honkaku.querySelectorAll('input[name$="_parts04"]:checked');
			// 無選択状態
			if (els.length == 0) {
				checkEnable(p01);
				checkEnable(p02);
				checkEnable(p03);
				checkEnable(p04);
				this.selArr = [];
				this.setScore(0);
				return this.getScore();
			}
			this.selArr= [];
			for (var i = 0; i < els.length; i++) {
				// 基本項目が選択されたら特定/関連項目はdisabled
				if (els[i].name === 'honkaku_parts02') {
					checkDisable(p03, p04);
				} else {
					checkEnable(p03, p04);
				}

				// 特定項目が2つ選択されたら他のチェックボックス/関連項目はdisabled
				if (p03c.length == 2) {
					checkDisable(p03nc, p04);
				} else if (p03c.length == 1 || p04c.length == 1) {
					checkDisable(p03nc);
				}

				// 特定/関連項目が選択されたら基本項目はdisabled
				if (els[i].name === 'honkaku_parts03' || els[i].name === 'honkaku_parts04') {
					checkDisable(p02);
				} else {
					checkEnable(p02);
				}

				this.putSelArr(els[i].parentNode.textContent);
				score += parseInt(els[i].dataset.points);
			}
			function checkEnable() {
				for (var i = 0; i < arguments.length; i++) {
					for (var j = 0; j < arguments[i].length; j++) {
						arguments[i][j].disabled = false;
					}
				}
			}
			function checkDisable() {
				for (var i = 0; i < arguments.length; i++) {
					for (var j = 0; j < arguments[i].length; j++) {
						arguments[i][j].disabled = true;
					}
				}
			}
			this.setScore(score > 100 ? 100 : score);
			return this.getScore();
		},
		setScore: function(val) {
			this.score = val;
		},
		getScore: function() {
			return this.score;
		},
		putSelArr: function(val) {
			this.selArr.push(val);
		},
		getSelArr: function() {
			return this.selArr;
		},
		setScoreBarVal: function(val) {
			var scoreBar = document.querySelector('#honkaku > div.modal-dialog > div.modal-content > div.modal-footer > div.progress > div.progress-bar');
			scoreBar.style.width = scoreBar.textContent = val + '%';
		},
		retResultValue: function(index) {
			var selArr = this.getSelArr();
			var score = this.getScore();
			var result = '';
			if (score == 0) {
				result = '';
			} else if ( (score > 0 && score < 100) || index == 2) {
				result = '　◆' + selArr.join('／') + '聴取するも本人確認不成立';
			} else if (score == 100 && index != 2) {
				result = '　◆' + selArr.join('／') + 'で本人確認済';
			}
			return result;
		}
	},

	// テンプレJSON読込＆セット
	temps: {
		data: '',
		tabKeys: '',
		tabContents: '',
		setKeys: function() {
			this.tabKeys = Object.keys(this.data);
			this.tabContents = Object.values(this.data);
		},

		create_panel: {
			id: '',
			hTitle: '',
			create_base: function(self, id, val) {
				this.id = id;
				var base = document.createElement('div');
				base.setAttribute('role', "tabpanel");
				base.className = 'tab-pane fade';
				base.id = id.slice(1); // "#"取る
				base.insertAdjacentElement('afterbegin', document.createElement('div'));
				var panel = base.firstChild;
				panel.className = 'panel panel-primary';
				// panel-header
				var pHeader = document.createElement('div');
				pHeader.classList.add('panel-heading');
				this.create_header(pHeader, val);
				panel.insertAdjacentElement('beforeend', pHeader);
				// panel-body
				var pBody = document.createElement('div');
				pBody.classList.add('panel-body');
				var cont = self.temps.makeTable(val.contents);
				pBody.insertAdjacentElement('afterbegin', cont);
				panel.insertAdjacentElement('beforeend', pBody);
				// panel-footer
				var pFooter = document.createElement('div');
				pFooter.classList.add('panel-footer');
				pFooter.insertAdjacentHTML('afterbegin', self.commonFunc.set_footer_btn(id));
				panel.insertAdjacentElement('beforeend', pFooter);

				return base;
			},
			create_header: function(pHeader, val) {
				pHeader.insertAdjacentElement('beforeend', document.createElement('h5'));
				pHeader.firstChild.classList.add('panel-title');
				pHeader.firstChild.dataset.key = val.header.key ? val.header.key : '';
				pHeader.firstChild.textContent = this.hTitle = val.header.text;
			},
			change_headerData: function(self, id, val, key) {
				var pHeader = document.querySelector('#template > div.tab-content > div#' + id + ' > div.panel').firstElementChild;
				var hashId = '#' + id;
				var menuObj = self.menu;
				var title = (function() {
					for (var k in menuObj) {
						if (menuObj[k] === hashId) {
							return k;
						}
					}
				})();
				pHeader.firstChild.textContent = val === '' ? title : title + ' □' + val + '□';
				pHeader.firstChild.dataset.key = key;
				self.logging.set_TabTitleKey(key);
			},
			_init: function(self, id, val) {
				return this.create_base(self, id, val);
			}
		},

		makeTable: function(cont) {
			var tbl = document.createElement('table');
			tbl.classList.add('table');
			var tbody = document.createElement('tbody');
			tbl.insertAdjacentElement('afterbegin', tbody);

			for (var i = 0; i < cont.length; i++) {
				// ここにtr中身生成func
				var trCont = this.makeTr(cont[i]);
				tbody.insertAdjacentElement('beforeend', trCont);
			}

			return tbl;
		},

		makeTr: function(cont) {
			var tr = document.createElement('tr');
			var attr = cont.attr ? cont.attr : false;

			// 初期表示フラグ：デフォで非表示にするか設定
			var visible = (cont.visible === undefined) ? true : cont.visible;
			if (!visible)
				tr.classList.add('inactive');
			// tr用attribute
			if (attr) {
				for (var k in attr) {
					if (attr.hasOwnProperty(k)) {
						tr.setAttribute(k, attr[k]);
					}
				}
			}

			var th = this.makeTh(cont);
			if (th)
				tr.insertAdjacentElement('beforeend', th);

			var td = this.makeTd(cont, th);
			if (td)
				tr.insertAdjacentElement('beforeend', td);

			return tr;
		},

		makeTh: function(cont) {
			var th = document.createElement('th');
			if (cont.title) {
				th.insertAdjacentHTML('beforeend', cont.title);
				for (var k in cont.th) {
					if (cont.th.hasOwnProperty(k)) {
						th.setAttribute(k, cont.th[k]);
					}
				}
			}
			return th;
		},

		makeTd: function(cont, th) {
			if (!cont.parts) return false;
			var td = this.td_base();

			var parts_arr = cont.parts;
			for (var i = 0; i < parts_arr.length; i++) {
				var tdCont = this.makeTdCont(parts_arr[i].type, parts_arr[i], th);
				var visible = (parts_arr[i].visible === undefined) ? true : parts_arr[i].visible;
				var logging = parts_arr[i].log ?
							parts_arr[i].log :
							parts_arr[i].type === 'memo' ? 'none' : false;

				if (!visible) tdCont.classList.add('inactive');
				tdCont.dataset.log = logging ? logging : 'normal';

				/* valid */
				var valid = parts_arr[i].valid ? parts_arr[i].valid : false;
				if (parts_arr[i].valid) {
					for (var k in valid) {
						if (valid.hasOwnProperty(k)) {
							tdCont.dataset[k] = valid[k];
						}
					}
				}

				var outaiM = parts_arr[i].outai_memo ? parts_arr[i].outai_memo : false;
				if(outaiM) {
					for (var k in outaiM) {
						if (outaiM.hasOwnProperty(k)) {
							tdCont.dataset[k] = outaiM[k];
						}
					}
				}

				td.insertAdjacentElement('beforeend', tdCont);
				this.add_memo(tdCont, parts_arr[i]);
			}
			return td;
		},

		makeTdCont: function(partsType, obj, th) {
			var addon = obj.addon ? obj.addon : false;
			var obj_select = obj.select ? obj.select : false;
			switch (partsType) {
				case 'plain': {
					var div = document.createElement('div');
					if (obj.attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								div.setAttribute(k, obj.attr[k]);
							}
						}
					}
					div.insertAdjacentHTML('beforeend', obj.source);
					return div;
				}

				case 'input-text': {
					var inputEl = this.input_base();
					if (obj.input_attr) {
						for (var k in obj.input_attr) {
							if (obj.input_attr.hasOwnProperty(k)) {
								inputEl.setAttribute(k, obj.input_attr[k]);
							}
						}
					}
					return inputEl;
				}

				case 'input-group-min':
				case 'input-group': {
					var inp_g = document.createElement('div');
					inp_g.classList.add('input-group');
					if (partsType === 'input-group-min') {
						inp_g.classList.add('min');
					}
					// input-group用attr
					if (obj.group_attr) {
						for (var k in obj.group_attr) {
							if (obj.group_attr.hasOwnProperty(k)) {
								inp_g.setAttribute(k, obj.group_attr[k]);
							}
						}
					}
					var inputEl = this.input_base(obj.base);
					// input要素用attr
					if (obj.input_attr) {
						for (var k in obj.input_attr) {
							if (obj.input_attr.hasOwnProperty(k)) {
								inputEl.setAttribute(k, obj.input_attr[k]);
							}
						}
					}
					inp_g.appendChild(inputEl);
					var addon = obj.addon;
					if (addon) {
						for (var i = 0; i < addon.length; i++) {
							// input-group-addon
							var span = this.addon_parts(addon[i], inp_g);
						}
					}
					return inp_g;
				}

				case 'clearfix': {
					var div = this.ins_clearfix();
					var attr = obj.attr ? obj.attr : false;
					if (attr) {
						for (var k in attr) {
							if (obj.attr.hasOwnProperty(k)) {
								div.setAttribute(k, attr[k]);
							}
						}
					}
					return div;
				}

				case 'radio-block':
				case 'radio-inline': {
					var label = document.createElement('label');
					var inputEl = document.createElement('input');
					inputEl.checked = obj.checked ? true : false;
					inputEl.type = 'radio';
					if (obj.key) inputEl.dataset.key = obj.key;
					if (obj.attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								label.setAttribute(k, obj.attr[k]);
							}
						}
					}
					if (obj.input_attr) {
						for (var k in obj.input_attr) {
							if (obj.input_attr.hasOwnProperty(k)) {
								inputEl.setAttribute(k, obj.input_attr[k]);
							}
						}
					}
					if (obj.target) {
						th.classList.add('choose');
						inputEl.dataset.targetName = inputEl.name + '_' + obj.target;
					}
					label.appendChild(inputEl);
					label.insertAdjacentText('beforeend', obj.label);

					if (partsType === 'radio-block') {
						var div = document.createElement('div');
						div.classList.add('radio');
						div.appendChild(label);
						return div;
					} else {
						label.classList.add('radio-inline');
						return label;
					}
				}

				case 'radio-toggle-dis': {
					var div = this.toggle_dis_base(obj, 'radio');
					return div;
				}

				case 'checkbox-toggle-dis': {
					var div = this.toggle_dis.base(obj, 'checkbox');
					return div;
				}

				case 'checkbox': {
					var div = document.createElement('div');
					div.classList.add('checkbox');
					var label = document.createElement('label');
					div.appendChild(label);
					var chkbox = document.createElement('input');
					chkbox.type = 'checkbox';
					label.appendChild(chkbox);
					label.insertAdjacentText('beforeend', obj.label);
					if (obj.must == true) {
						var span = document.createElement('span');
						span.classList.add('must');
						span.insertAdjacentText('beforeend', '【案内したらチェック】');
						label.insertAdjacentElement('beforeend', span);
						div.dataset.must = true;
					} else {
						div.dataset.must = false;
					}
					if (obj.attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								div.setAttribute(k, obj.attr[k]);
							}
						}
					}
					return div;
				}

				case 'textarea': {
					var tArea = this.make_textarea();
					if (obj.attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								if (k === 'value') {
									tArea.textContent = obj.attr[k];
								} else {
									tArea.setAttribute(k, obj.attr[k]);
								}
							}
						}
					}
					return tArea;
				}

				case 'memo': {
					var span = document.createElement('span');
					span.classList.add('memo');
					span.insertAdjacentHTML('afterbegin', obj.value);
					if (obj.attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								span.setAttribute(k, obj.attr[k]);
							}
						}
					}
					return span;
				}

				case 'select': {
					var selectEl = this.select_base();
					var attr = obj_select.attr ? obj_select.attr : false;
					if (attr) {
						for (var k in obj.attr) {
							if (obj.attr.hasOwnProperty(k)) {
								selectEl.setAttribute(k, obj.attr[k]);
							}
						}
					}
					this.add_option(obj_select.option, selectEl);
					var toggle = obj.opt_toggle ? obj.opt_toggle : false;
					if (toggle) {
						th.classList.add('choose');
						selectEl.dataset.optionToggle = "true";
					}
					return selectEl;
				}

				case 'supp_plan': {
					// 主に電力会社/契約種別タイプ用
					var attr = obj_select.attr ? obj_select.attr : false;
					var select_supp = this.select_base();
					if (attr) {
						for (var k in attr) {
							if (attr.hasOwnProperty(k)) {
								select_supp.setAttribute(k, attr[k]);
							}
						}
					}
					this.add_option(obj_select.option, select_supp);
					return select_supp;
				}

				case 'calendar': {
					var calDiv = document.createElement('div');
					var attr = obj.attr ? obj.attr : false;
					var cal_ops = obj.cal_ops;
					calDiv.id = cal_ops.id;
					if (attr) {
						for (var k in attr) {
							if (attr.hasOwnProperty(k)) {
								calDiv.setAttribute(k, attr[k]);
							}
						}
					}

					// カレンダー組み込み
					window.addEventListener('load', function() {
						var cal = new EiRekiCal(cal_ops);
						cal.showCalendar();
					});

					return calDiv;
				}
			}
		},

		ins_clearfix: function() {
			var div = document.createElement('div');
			div.classList.add('clearfix');
			div.setAttribute('style', 'margin-bottom: 8px;');
			return div;
		},

		td_base: function() {
			var td = document.createElement('td');
			return td;
		},

		input_base: function(base) {
			var element;
			if (!base) {
				element = document.createElement('input');
				element.type = 'text';
			} else {
				element = document.createElement(base);
			}
			element.className = 'form-control input-sm';
			return element;
		},

		select_base: function() {
			var select = document.createElement('select');
			select.className = 'form-control input-sm';
			return select;
		},

		make_textarea: function() {
			var tArea = document.createElement('textarea');
			tArea.classList.add('form-control input-sm');
			return tArea;
		},

		toggle_dis_base: function(obj, inputType) {
			var div = document.createElement('div');
			div.classList.add(inputType);
			var addon = obj.addon ? obj.addon : false;
			var label = document.createElement('label');
			var inputEl = document.createElement('input');
			inputEl.type = inputType;
			if (obj.input_attr) {
				for (var k in obj.input_attr) {
					if (obj.input_attr.hasOwnProperty(k)) {
						inputEl.setAttribute(k, obj.input_attr[k]);
					}
				}
			}
			inputEl.checked = obj.checked ? true : false;
			inputEl.dataset.disableToggle = true;
			label.insertAdjacentElement('beforeend', inputEl);
			label.insertAdjacentText('beforeend', obj.label);
			div.insertAdjacentElement('beforeend', option);
			if (addon)
				this.addon_toggle(addon, div);
			return div;
		},

		add_option: function(arr, target) {
			for (var i = 0; i < arr.length; i++) {
				var option = document.createElement('option');
				option.appendChild(document.createTextNode(arr[i]));
				target.insertAdjacentElement('beforeend', option);
			}
		},

		add_memo: function(el, target) {
			if (!target.memo) return false;

			if (el.tagName.toLowerCase() === 'td' || el.tagName.toLowerCase() === 'div') {
				el = el.lastChild;
			}

			// メモ（補足情報）は強制 display:block; 化
			var memoObj = target.memo;
			var span = document.createElement('span');
			span.classList.add('memo');

			if (memoObj.attr) {
				for (var k in memoObj.attr) {
					if (memoObj.attr.hasOwnProperty(k)) {
						span.setAttribute(k, memoObj.attr[k]);
					}
				}
			}
			span.insertAdjacentHTML('afterbegin', memoObj.source);
			el.insertAdjacentElement('afterend', span);
		},
		addon_parts: function(addon, inp_g) {
			var span = document.createElement('span');
			switch(addon.span) {
				case 'button':
					span.classList.add('input-group-btn');
					var btn = document.createElement('button');
					span.insertAdjacentElement('afterbegin', btn);
					btn.className = 'btn btn-primary btn-sm';
					if (addon.id)
						btn.id = addon.id;
					if (addon.target)
						bth.setAttribute('for', addon.target);
					if (addon.name)
						btn.name = addon.name;
					
					if (addon.icon) {
						var span2 = document.createElement('span');
						span2.classList.add('glyphicon');
						span2.classList.add(addon.label);
						btn.appendChild(span2);
					} else {
						btn.appendChild(document.createTextNode(addon.label));
					}
					if (addon.counter) {
						btn.dataset.counter = addon.counter;
					}
					this.insert_addon_pos(inp_g, addon.position, span);
					return span;

				case 'text':
					span.classList.add('input-group-addon');
					span.appendChild(document.createTextNode(addon.label));
					this.insert_addon_pos(inp_g, addon.position, span);
					return span;
			}
		},

		addon_toggle: function (obj, div) {
			switch (obj.type) {
				case 'text':
					var input = this.input_base();
					if (obj.attr) {
						for (var m in obj.attr) {
							if (obj.attr.hasOwnProperty(m)) {
								input.setAttribute(m, obj.attr[m]);
							}
						}
					}
					// デフォでdisabled
					input.disabled = true;
					div.insertAdjacentElement('beforeend', input);
					break;
			
				case 'textarea':
					var tArea = this.make_textarea();
					if (obj.attr) {
						for (var m in obj.attr) {
							if (obj.attr.hasOwnProperty(m)) {
								if (m === 'value') {
									tArea.textContent = obj.attr[m];
								} else {
									tArea.setAttribute(m, obj.attr[m]);
								}
							}
						}
					}
					// デフォでdisabled
					tArea.disabled = true;
					div.insertAdjacentElement('beforeend', tArea);
					break;

				case 'select':
					var options = [].slice.call(obj.option);
					var select = this.select_base();
					for (var i = 0; i < options.length; i++) {
						var opt = document.createElement('option');
						opt.textContent = options[i];
						select.insertAdjacentElement('beforeend', opt);
					}

					// デフォでdisabled
					select.disabled = true;
					div.insertAdjacentElement('beforeend', select);
					break;
			}
		},

		insert_addon_pos: function(target, pos, el) {
			if (pos === 'before') {
				target.insertAdjacentElement('afterbegin', el);
			} else {
				target.insertAdjacentElement('beforeend', el);
			}
		},

		putTab: function(self) {
			var $content = document.querySelector('#template div.tab-content');
			for (var i = 0; i < this.tabKeys.length; i++) {
				var base = this.create_panel._init(self, this.tabKeys[i], this.tabContents[i]);
				$content.insertAdjacentElement('beforeend', base);
			}
		},

		init: function(self) {
			this.setKeys();
			this.putTab(self);
		}
	},

	zipCode: {
		setSearch: function(self) {
			var henkanObj = {
				'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ','ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
				'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ','ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
				'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ','ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
				'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ','ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
				'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ','ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
				'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ','ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
				'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ','ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
				'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド','ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
				'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ','ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
				'｡': '。', '､': '、', 'ｰ': 'ー', '｢': '「', '｣': '」', '･': '・'
			};

			const reg = new RegExp('[' + Object.keys(henkanObj).join('|') + ']', 'g');

			var zipButtons = document.getElementsByName('zip');

			for (var i = 0, len = zipButtons.length; i < len; i++) {
				self.commonFunc.addListener(zipButtons[i], 'click', function() {
					var prevInput = this.parentNode.previousElementSibling;
					var zipCode = { code: prevInput.value.replace(/-/g, '') };
					var kana_group = this.parentNode.parentNode.nextElementSibling.nextElementSibling;
					var kana_el = kana_group.childNodes[1];
					var addr_group = kana_group.nextElementSibling.nextElementSibling;
					var addr_el = kana_group.childNodes[1];
					zipAjax(zipCode).done(function(data) {
						if (!data) {
							self.commonFunc.msg_box('alert', '該当する住所が見つかりませんでした。', 1000);
							kana_el.value = '';
							addr_el.value = '';
							prevInput.focus();
							prevInput.select();
						} else {
							var kana1 = data[0].kana1.replace(reg, function(match) { return henkanObj[match]; });
							var kana2 = data[0].kana2.replace(reg, function(match) { return henkanObj[match]; });
							kana_el.value = kana1 + '　' + kana2;
							addr_el.value = data[0].pref + data[0].add1 + data[0].add2;
						}
					}).fail(function(xhr, t, err) {
						console.log('Error:' + err);
					});
				});
			}

			function zipAjax(dat) {
				return $.ajax({
					type: 'POST',
					url: './scripts/zip.php',
					data: dat
				});
			}
		},

		init: function(self) {
			this.setSearch(self);
		}
	},

	init: function() {
		this.menu_toggle = 0;
		this.set_json_data();
		this.set_menu_list();
		this.honkaku.init();
		this.temps.init(this);
		this.zipCode.init(this);
		this.setEvent();
		this.commonFunc.changeHearingH();
		this.commonFunc.hashSync(this);
	}
}


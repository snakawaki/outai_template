var EiRekiCal = function (args) {
	var today = new Date();
	this.todayYear = today.getFullYear();
	this.todayMonth = today.getMonth() + 1;
	this.todayDate = today.getDate();
	this.todayYMD = new Date(this.todayYear + '/' + this.todayMonth + '/' + this.todayDate + ' 09:00');

	// プロパティnenn, tukiは次月・前月クリックで変化する値
	this.nenn = this.todayYear;
	this.tuki = this.todayMonth;
	this.nichi = this.todayDate;

	// 年月日の区切り文字
	this.splitter = '_';
	// 現在選択されている日付
	this.currentDay = [this.nenn, this.tuki, this.nichi].join(this.splitter);
	// 各カレンダーのインスタンス名
	this.instance = args.id;
	// 営暦タイプ
	this.ERtype = args.type;
	// 必要営業日/暦日数
	this.gaps = args.gap_days.slice();
	// input:textのname
	this.inputName = args.inputName;
	// 備考
	this.memo = args.memo;
	// 最短受付可能日
	this.fastestDate = {y:'', m: '', d: ''};
};

EiRekiCal.prototype = {
	// 各月の日数
	monthDays: new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31),
	// 表示されている月の前月の年
	prevNenn: null,
	// 表示されている月の次月の年
	nextNenn: null,
	// 表示されている月の前月
	prevTuki: null,
	// 表示されている月の次月
	nextTuki: null,
	// 曜日インデックスに応じたJP曜日
	youbiTxtJpn: ['日', '月', '火', '水', '木', '金', '土'],

	setNengetsu: function(dore) {
		// 次月
		if (dore === 1) this.tuki++;
		// 当月
		if (dore === 0) {
			this.nenn = this.todayYear;
			this.tuki = this.todayMonth;
		}
		// 前月
		if (dore === -1) this.tuki--;
		// this.tukiの計算結果が13だったら
		if (this.tuki === 13) {
			// 年を越す
			this.nenn++;
			this.tuki = 1;
		}
		// this.tukiの計算結果が0だったら
		if (this.tuki === 0) {
			// 年を戻す
			this.nenn--;
			this.tuki = 12;
		}
		// 閏年の場合
		this.monthDays[1] = (this.isLeapYear(this.nenn)) ? 29 : 28;
		
	},

	setPrevNext: function() {
		if (this.tuki === 1) {
			this.prevNenn = this.nenn - 1;
			this.prevTuki = 12;
		} else {
			this.prevNenn = this.nenn;
			this.prevTuki = this.tuki - 1;
		}
		if (this.tuki === 12) {
			this.nextNenn = this.nenn + 1;
			this.nextTuki = 1;
		} else {
			this.nextNenn = this.nenn;
			this.nextTuki = this.tuki + 1;
		}
	},

	createHTML: function() {
		/* 仮想DOM:input-group用div */
		{
			var inpGroupDiv = document.createElement('div');
			inpGroupDiv.classList.add('input-group');

			/* input-group: カレンダーボタンパーツ */
			var spanGrpBtn = document.createElement('span');
				spanGrpBtn.classList.add('input-group-btn');
				spanGrpBtn.setAttribute('name', 'cal');
			var calBtn = document.createElement('button');
				calBtn.id = 'btn_' + this.instance;
				calBtn.classList.add('btn');
				calBtn.classList.add('btn-success');
				calBtn.classList.add('btn-sm');
			var calIcon = document.createElement('span');
				calIcon.classList.add('glyphicon');
				calIcon.classList.add('glyphicon-calendar');
			calBtn.appendChild(calIcon);
			spanGrpBtn.appendChild(calBtn);

			/* input-group: 日付入力欄 */
			var dateInput = document.createElement('input');
				dateInput.type = 'text';
				dateInput.classList.add('form-control');
				dateInput.classList.add('input-sm');
				dateInput.dataset.calendar = 'div_' + this.instance;
				dateInput.id = this.instance + '_dateInput';
				this.inputName ? dateInput.name = this.inputName : null;
				dateInput.style.width = '12em';

			/* input-group タグ組み込み完了 */
			inpGroupDiv.appendChild(spanGrpBtn);
			inpGroupDiv.appendChild(dateInput);
		}

		/* 仮想DOM:calenar-table用div */
		{
			var divCal = document.createElement('div');
				divCal.id = 'div_' + this.instance;
				divCal.classList.add('modal');
				divCal.setAttribute('tabindex', '-1');
			
			/* calendar-table */
			var tblCal = document.createElement('table');
				tblCal.classList.add('table');
				tblCal.classList.add('table-bordered');
				tblCal.id = 'tbl_' + this.instance;

			/* calendar-table.thead:年月コントロール、曜日 */
			var tblHead = document.createElement('thead');
				tblHead.appendChild(document.createElement('tr'));
				tblHead.children[0].setAttribute('name', 'calControl');
				tblHead.children[0].appendChild(document.createElement('th'));
				/* 年月コントロール */
				var controlHead = tblHead.children[0].children[0];
					controlHead.colSpan = '7';
					var aPrev = document.createElement('a');
						aPrev.id = this.instance + '_prevMonth';
						aPrev.appendChild(document.createTextNode('<前月'));
					var aCurr = document.createElement('a');
						aCurr.id = this.instance + '_currMonth';
						aCurr.appendChild(document.createTextNode('----年--月'));
					var aNext = document.createElement('a');
						aNext.id = this.instance + '_nextMonth';
						aNext.appendChild(document.createTextNode('次月>'));
					
					controlHead.appendChild(aPrev);
					controlHead.insertAdjacentText('beforeend', '　｜　');
					controlHead.appendChild(aCurr);
					controlHead.insertAdjacentText('beforeend', '　｜　');
					controlHead.appendChild(aNext);
				
				tblHead.appendChild(document.createElement('tr'));
				/* 曜日 */
				var youbi = tblHead.children[1];
				for (var i = 0; i < 7; i++) {
					youbi.appendChild(document.createElement('th'));
					youbi.children[i].appendChild(document.createTextNode(this.youbiTxtJpn[i]));
				}
			
			// tableタグにthead要素を追加
			tblCal.appendChild(tblHead);

			/* calendar-table.tbody：日付部分 */
			var tblBody = document.createElement('tbody');
			// tableタグにtbody要素（空でOK）を追加
			tblCal.appendChild(tblBody);

			if (this.memo) {
				// 最下部に備考欄tfootを設置
				var tblFooter = document.createElement('tfoot');
				var tblFootRow = document.createElement('tr');
				var memoCellTitle = document.createElement('td');
					memoCellTitle.appendChild(document.createTextNode('備考'));
				var memoCellMain = document.createElement('td');
					memoCellMain.colSpan = '6';
					memoCellMain.innerHTML = this.memo;
				tblFootRow.appendChild(memoCellTitle);
				tblFootRow.appendChild(memoCellMain);
				tblFooter.appendChild(tblFootRow);
				tblCal.appendChild(tblFooter);
			}

			// 大枠のdivにtableタグ追加
			divCal.appendChild(tblCal);
		}

		// 呼び出し元のdivパーツ組み込み
		document.getElementById(this.instance).appendChild(inpGroupDiv);
		document.getElementById(this.instance).appendChild(divCal);
	},

	setDays: function() {
		// 年月を埋め込み
		var YyMm = document.getElementById(this.instance + '_currMonth');
		var txtYyMm = document.createTextNode(this.nenn + '年' + this.tuki + '月');
		YyMm.replaceChild(txtYyMm, YyMm.firstChild);

		// 表示月の1日の曜日取得（0:日曜〜）
		var youbiDate = new Date(this.nenn, this.tuki - 1, 1);
		var ippiYoubi = youbiDate.getDay();
		// 最初のマスの日付（1日から曜日indexを引いてマイナス分を取得）
		// 前月の末日からhizukeを原産すれば最初のマスの日数が決まる。
		var hizuke = 1 - ippiYoubi;
		// 前月・次月部分の年と月の値をセット
		this.setPrevNext();

		// 閏年の場合
		this.isLeapYear(this.nenn) ?
			this.monthDays[1] = 29 :
			this.monthDays[1] = 28;

		// 日付オブジェクト作成
		var daysObj = Object.create(null);
		for (var i = 0; i < 42; i++) {
			daysObj[i] = Object.create(null);
			// 前月部分
			if (hizuke <= 0) {
				daysObj[i] = {
					yyyy: this.prevNenn,
					mm: this.prevTuki,
					dd: this.monthDays[this.prevTuki-1] + hizuke,
					class: 'unClickable trans'
				}
				this.checkEachDate(daysObj[i]);
			}
			// 今月部分
			if (hizuke >= 1 && (hizuke <= this.monthDays[this.tuki-1])) {
				daysObj[i] = {
					yyyy: this.nenn,
					mm: this.tuki,
					dd: hizuke,
					class: 'clickable'
				}
				this.checkEachDate(daysObj[i]);
			}
			// 次月部分
			if (hizuke > this.monthDays[this.tuki-1]) {
				daysObj[i] = {
					yyyy: this.nextNenn,
					mm: this.nextTuki,
					dd: hizuke - this.monthDays[this.tuki-1],
					class: 'unClickable trans'
				}
				this.checkEachDate(daysObj[i]);
			}
			hizuke++;
		}

		// 日付マス：一旦削除
		var tbody = document.getElementById('tbl_' + this.instance).querySelector('tbody');
		tbody.parentNode.removeChild(tbody);
		/* calendar-table.tbody:日付部分 */
		var tblBody = document.createElement('tbody');
		for (var i = 0; i < 6; i++) {
			var row = document.createElement('tr');
			for (var j = 0; j < 7; j++) {
				var cell = document.createElement('td');
				cell.insertAdjacentHTML('afterbegin', '&ensp;');
				row.appendChild(cell);
			}
			tblBody.appendChild(row);
		}
		var tblCal = document.getElementById('tbl_' + this.instance);
		tblCal.appendChild(tblBody);

		// 日付マスの要素取得
		var tdElements = document.querySelectorAll('#' + this.instance + ' tbody td');
		// それぞれの日付マスにdaysObjの各プロパティ値を埋め込んでいく
		for (var i = 0; i < tdElements.length; i++) {
			var dd = document.createTextNode(daysObj[i].dd);
			tdElements[i].replaceChild(dd, tdElements[i].firstChild);
			tdElements[i].className = daysObj[i].class;
		}

		// 日付をクリック
		var self = this;
		var clickableTdEl = [];
		for (var i = 0; i < tdElements.length; i++) {
			if (tdElements[i].className.indexOf('clickable') !== -1) {
				tdElements[i].dataset.dismiss = 'modal';
				clickableTdEl.push(tdElements[i]);
			}
		}
		// addEventListenerが重複しているので初回カレンダー呼び出し分のイベントを削除しないといけない
		var dateInput = document.getElementById(this.instance + '_dateInput');
		var tdClickFunc = function() {
			var dd = this.firstChild.nodeValue;
			var txtYMD = self.nenn + '年' + self.tuki + '月' + dd + '日(' + self.youbiTxtJpn[this.cellIndex] + ')';
			dateInput.value = txtYMD;
			self.toggleCal();
		};
		for (var i = 0; i < clickableTdEl.length; i++) {
			clickableTdEl[i].removeEventListener('click', tdClickFunc);
			this.addListener(clickableTdEl[i], 'click', tdClickFunc);
		}
	},

	// 最短対応可能日を割り出す
	fastestDay: function() {
		/**
		 * type(int)
		 *  0:営業日対応（平日のみ）
		 *  1:暦日対応（土日祝問わず）
		 *  2:最短までは営業日カウント分。それ以降なら土日祝も対応可能。
		 *  3:営業日＋暦日(type:0とtype:1)の組み合わせ。
		 * gaps(array)
		 *  type:0,1,2	→ 0番目要素のみ使用
		 *  type:3		→ 0番目要素（営業日）+1番目要素（暦日）で計算
		 */
		var gap = this.gaps.slice();
		switch(this.ERtype) {
			case 0:
			case 2:
				var first_gap = gap[0];
				for (var i = 1; i <= first_gap; i++) {
					// 一時変数を設定。今日をDate関数で収納。
					var tmpD = new Date(this.todayYMD);
					// 一時変数tmpDを基準に1日ずつ加算する
					tmpD.setDate(tmpD.getDate() + i);
					if (this.boolHeijitsu(tmpD)) {
						// i日加算された日が平日だったら最短受付日に設定
						this.fastestDate.y = tmpD.getFullYear();
						this.fastestDate.m = tmpD.getMonth() + 1;
						this.fastestDate.d = tmpD.getDate();
					} else {
						// 土日祝だったら、必要日数を延ばす
						first_gap++;
					}
				}
				break;

			case 3:
				var first_gap = gap[0];
				var second_gap = gap[1];
				for (var i = 1; i <= first_gap; i++) {
					var tmpD = new Date(this.todayYMD);
					tmpD.setDate(tmpD.getDate() + i);
					if (this.boolHeijitsu(tmpD)) {
						this.fastestDate = {
							y: tmpD.getFullYear(),
							m: tmpD.getMonth - 1,
							d: tmpD.getDate()
						}
					} else {
						first_gap++;
					}
				}
				tmpD.setDate(tmpD.getDate() + second_gap);
				this.fastestDate = {
					y: tmpD.getFullYear(),
					m: tmpD.getMonth - 1,
					d: tmpD.getDate()
				}
				break;
		}
	},

	boolHeijitsu: function(d) {
		var syuNo = holiday.func(d.getFullYear(), d.getMonth() + 1, d.getDate());
		return (d.getDay() == 0 || d.getDay() == 6 || syuNo >= 0) ? false : true;
	},

	checkEachDate: function(dObj) {
		/* 祝日判定 */
		var syuNo = holiday.func(dObj.yyyy, dObj.mm, dObj.dd);
		if (syuNo >= 0) {
			dObj.class += ' holidays';
		}
		/* 日付比較用 */
		var hikakuDate = new Date(dObj.yyyy + '/' + dObj.mm + '/' + dObj.dd + ' 09:00');
		var hikakuDay = hikakuDate.getDay();
		var jikansa = (hikakuDate - this.todayYMD) / 1000 / 86400;
		/* 1日：86,400秒 */
		/* 今日と同日か */
		if (jikansa === 0) dObj.class += ' today_cell';
		/* 前日まではクリック不可に */
		if (jikansa < 0) {
			dObj.class = dObj.class.replace('clickable', 'unClickable');
		}
		/* ↑までがデフォルト表示。↓以降は、引数：type,gapsを用いてクリック可判定 */
		// ギャップ計算する処理
		var fastest = new Date(this.fastestDate.y + '/' + this.fastestDate.m + '/' + this.fastestDate.d + ' 09:00');
		var gapFrom = (fastest - hikakuDate) / 1000 / 86400; // 日数を割り出す
		switch(this.ERtype) {
			case 0:
				if (syuNo >= 0 || hikakuDay == 0 || hikakuDay == 6) {
					dObj.class = dObj.class.replace('clickable', 'unClickable');
				} else {
					if (gapFrom > 0) {
						dObj.class = dObj.class.replace('clickable', 'unClickable');
					}
				}
				break;
			case 1:
				if (jikansa < this.gaps[0]) {
					dObj.class = dObj.class.replace('clickable', 'unClickable');
				}
				break;
			case 2:
			case 3:
				if (gapFrom > 0) {
					dObj.class = dObj.class.replace('clickable', 'unClickable');
				}
				break;
		}
	},

	createBackDrop: function() {
		var backDiv = document.createElement('div');
			backDiv.id = 'calBackdrop';
			backDiv.style.position = 'fixed';
			backDiv.style.top = 0;
			backDiv.style.left = 0;
			backDiv.style.width = '100vw';
			backDiv.style.height = '100vh';
			backDiv.style.zIndex = 1499;
			backDiv.style.display = 'block';
			backDiv.style.backgroundColor = 'rgba(0, 0, 0, .2)';
		document.body.appendChild(backDiv);

		// #calBackdropクリックで彼ンター閉じる
		var self = this;
		self.addListener(
			document.getElementById('calBackdrop'),
			'click',
			function() {
				self.toggleCal();
			}
		);
	},

	removeBackdrop: function() {
		var backDiv = document.body.getElementById('calBackdrop');
		backDiv.parentNode.removeChild(backDiv);
	},
	toggleCal: function() {
		// toggle calendar instance
		var cal = document.body.getElementById('div_' + this.instance);

		if (cal.style.display === 'none' || !cal.style.display) {
			cal.style.display = 'block';
			this.createBackDrop();
			document.body.classList.add('cal-open');
		} else {
			cal.style.display = 'none';
			this.removeBackdrop();
			document.body.classList.remove('cal-open');
		}
	},
	setEvent: function() {
		var self = this;
		// calendar button
		self.addListener(
			document.getElementById('btn_' + self.instance),
			'click',
			function() {
				self.toggleCal();
			}
		);

		// 前月をクリック
		self.addListener(
			document.body.getElementById(self.instance + '_prevMonth'),
			'click',
			function() {
				self.setNengetsu(-1);
				self.setDays();
			}
		);

		// 当月をクリック
		self.addListener(
			document.body.getElementById(self.instance + '_currMonth'),
			'click',
			function() {
				self.setNengetsu(0);
				self.setDays();
			}
		);

		// 次月をクリック
		self.addListener(
			document.body.getElementById(self.instance + '_nextMonth'),
			'click',
			function() {
				self.setNengetsu(1);
				self.setDays();
			}
		);
	},
	// イベントリスナー
	addListener: function(elm, ev, listener) {
		if (elm.addEventListener) {
			elm.addEventListener(ev, listener, false);
		} else if (elm.attachEvent) {
			elm.attachEvent('on' + ev, listener);
		} else {
			throw new Error('イベントリスナーに未対応です');
		}
	},
	// 閏年チェック
	isLeapYear: function(y) {
		if (((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0)) {
			return true;
		} else {
			return false;
		}
	},
	showCalendar: function() {
		// 最短受付可能日セット
		this.fastestDay();
		// カレンダーHTML作成
		this.createHTML();
		// 日付の埋め込み
		this.setDays();
		// イベントをセット
		this.setEvent();
	}
};

// 祝日定義
holidays = {
	splitter: '_',
	func: function(toshi, tsuki, hi) {
		var shukujitsu = [];
		var shuku_cnt = 0;
		var nichi;
		var shukuDay;

		// 定義開始
		// 国民の祝日
		// 元日（1月1日）
		shukujitsu[0] = [toshi, 1, 1].join(this.splitter);
		// 成人の日（1月第2月曜日）
		nichi = this.howDay(toshi, 1, 2, 1);
		shukujitsu[1] = [toshi, 1, nichi].join(this.splitter);
		// 建国記念日（2月11日）
		shukujitsu[2] = [toshi, 2, 11].join(this.splitter);
		// 新天皇誕生日（2月23日）
		if (toshi >= 2020) shukujitsu[3] = [toshi, 2, 23].join(this.splitter);
		// 春分の日
		var haru = Math.floor(20.8431 + 0.242194 * (toshi - 1980) - Math.floor((toshi - 1980) / 4));
		shukujitsu[4] = [toshi, 3, haru].join(this.splitter);
		// 昭和の日（4月29日）
		shukujitsu[5] = [toshi, 4, 29].join(this.splitter);
		// 憲法記念日（5月3日）
		shukujitsu[6] = [toshi, 5, 3].join(this.splitter);
		// みどりの日（5月4日）
		shukujitsu[7] = [toshi, 5, 4].join(this.splitter);
		// こどもの日（5月5日）
		shukujitsu[8] = [toshi, 5, 5].join(this.splitter);
		// 海の日（7月第3月曜日）
		nichi = this.howDay(toshi, 7, 3, 1);
		shukujitsu[9] = [toshi, 7, nichi].join(this.splitter);
		// 山の日（8月11日）
		shukujitsu[10] = [toshi, 8, 11].join(this.splitter);
		// 敬老の日（9月第3月曜日）
		nichi = this.howDay(toshi, 9, 3, 1);
		shukujitsu[11] = [toshi, 9, nichi].join(this.splitter);
		// 秋分の日（前年の2月1日官報に掲載）・簡易計算法
		var aki = Math.floor(23.2488 + 0.242194 * (toshi - 1980) - Math.floor((toshi - 1980) / 4));
		shukujitsu[12] = [toshi, 9, aki].join(this.splitter);
		// 体育の日（10月第2月曜日）
		nichi = this.howDay(toshi, 10, 2, 1);
		shukujitsu[13] = [toshi, 10, nichi].join(this.splitter);
		// 文化の日（11月3日）
		shukujitsu[14] = [toshi, 11, 3].join(this.splitter);
		// 勤労感謝の日（11月23日）
		shukujitsu[15] = [toshi, 11, 23].join(this.splitter);
		// 上皇様誕生日（12月23日）2018年まで祝日
		if (toshi <= 2018) shukujitsu[16] = [toshi, 12, 23].join(this.splitter);

		/* 振替休日（祝日が日曜日の場合、月曜日にセットする） */
		// 元日（1月1日）
		shukuDay = new Date(toshi, 0, 1);
		if (shukuDay.getDay() === 0) shukujitsu[17] = [toshi, 1, 2].join(this.splitter);
		// 建国記念日（2月11日）
		shukuDay = new Date(toshi, 1, 11);
		if (shukuDay.getDay() === 0) shukujitsu[18] = [toshi, 2, 12].join(this.splitter);
		// 新天皇誕生日（2月23日）
		if (toshi >= 2020) {
			shukuDay = new Date(toshi, 1, 23);
			if (shukuDay.getDay() === 0) shukujitsu[19] = [toshi, 2, 24].join(this.splitter);
		}
		// 春分の日
		shukuDay = new Date(toshi, 2, haru);
		if (shukuDay.getDay() === 0) {
			var haruDay = parseInt(haru) + 1;
			shukujitsu[20] = [toshi, 3, haruDay].join(this.splitter);
		}
		// 昭和の日（4月29日）
		shukuDay = new Date(toshi, 3, 29);
		if (shukuDay.getDay() == 0) shukujitsu[21] = [toshi, 4, 30].join(this.splitter);
		// 憲法記念日（5月3日）
		shukuDay = new Date(toshi, 4, 3);
		if (shukuDay.getDay() === 0) shukujitsu[22] = [toshi, 5, 6].join(this.splitter);
		// みどりの日（5月4日）
		shukuDay = new Date(toshi, 4, 4);
		if (shukuDay.getDay() === 0) shukujitsu[23] = [toshi, 5, 6].join(this.splitter);
		// こどもの日（5月5日）
		shukuDay = new Date(toshi, 4, 5);
		if (shukuDay.getDay() === 0) shukujitsu[24] = [toshi, 5, 6].join(this.splitter);
		// 山の日（8月11日）
		shukuDay = new Date(toshi, 7, 11);
		if (shukuDay.getDay() === 0) shukujitsu[25] = [toshi, 8, 12].join(this.splitter);
		// 秋分の日
		shukuDay = new Date(toshi, 8, aki);
		if (shukuDay.getDay() === 0) {
			var akiDay = parseInt(aki) + 1;
			shukujitsu[26] = [toshi, 9, akiDay].join(this.splitter);
		}
		// 文化の日（11月3日）
		shukuDay = new Date(toshi, 10, 3);
		if (shukuDay.getDay() === 0) shukujitsu[27] = [toshi, 11, 4].join(this.splitter);
		// 勤労感謝の日（11月23日）
		shukuDay = new Date(toshi, 10, 23);
		if (shukuDay.getDay() === 0) shukujitsu[28] = [toshi, 11, 24].join(this.splitter);
		// 上皇様誕生日（2018年まで）
		if (toshi <= 2018) {
			shukuDay = new Date(toshi, 11, 23);
			if (shukuDay.getDay() === 0) shukujitsu[29] = [toshi, 12, 24].join(this.splitter);
		}

		/* その前後が祝日の場合の休日（祝日にはさまれた平日） */
		// 敬老の日
		var keiro = parseInt(shukujitsu[12].substr(7, 2));
		// 秋分の日
		var syubun = parseInt(shukujitsu[15].substr(7, 2));
		if (syubun - keiro === 2) {
			keiro++;
			shukujitsu[30] = [toshi, 9, keiro].join(this.splitter);
		}

		/* オリンピックの特例 */
		if (toshi === 2020) {
			// 海の日
			shukujitsu[9] = [toshi, 7, 23].join(this.splitter);
			// スポーツ（体育）の日
			shukujitsu[13] = [toshi, 7, 24].join(this.splitter);
			// 山の日
			shukujitsu[10] = [toshi, 8, 10].join(this.splitter);
		}
		if (toshi === 2021) {
			// 海の日
			shukujitsu[9] = [toshi, 7, 22].join(this.splitter);
			// スポーツ（体育）の日
			shukujitsu[13] = [toshi, 7, 23].join(this.splitter);
			// 山の日
			shukujitsu[10] = [toshi, 8, 9].join(this.splitter);
		}

		/* 皇太子即位の特例 */
		shukujitsu[31] = [2019, 4, 30].join(this.splitter);
		shukujitsu[32] = [2019, 5, 1].join(this.splitter);
		shukujitsu[33] = [2019, 5, 2].join(this.splitter);
		shukujitsu[34] = [2019, 10, 22].join(this.splitter);

		/* 年末年始の休日 */
		shukujitsu[35] = [toshi, 12, 29].join(this.splitter);
		shukujitsu[36] = [toshi, 12, 30].join(this.splitter);
		shukujitsu[37] = [toshi, 12, 31].join(this.splitter);
		shukujitsu[38] = [toshi, 1, 2].join(this.splitter);
		shukujitsu[38] = [toshi, 1, 3].join(this.splitter);

		/* ↑祝日の定義はここまで */

		// 指定の日が祝日（or休日）かを判定
		for (var j = 0; j <= 30; j++) {
			shuku_cnt = shukujitsu.indexOf([toshi, tsuki, hi].join(this.splitter));
		}
		// 祝日の配列インデックスを返す
		return shuku_cnt;
	},

	howDay: function(year, month, n, WantDayWeek) {
		var nichi;
		var FirstDay = new Day(year, month - 1, 1);
		// 1日の日曜日
		var FirstDayWeek = FirstDay.getDay();
		// 求めたい日付（0かプラスの場合）
		if ((WantDayWeek - FirstDayWeek) >= 0) {
			nichi = 1 + (WantDayWeek - FirstDayWeek) + 7 * (n - 1);
		}
		// 求めたい日付（マイナスの場合）
		if ((WantDayWeek - FirstDayWeek) < 0) {
			nichi = 1 + (WantDayWeek - FirstDayWeek) + (7 * n);
		}
		return nichi;
	}
};
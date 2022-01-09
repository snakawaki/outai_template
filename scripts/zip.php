<?php
	try {
		$db = new PDO('sqlite:../data/zip_code.sqlite');
		$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

		$p_num = $_POST['code'];
		$sql = 'SELECT * FROM post WHERE post_code = "' . $p_num . '"';

		$stmt = $db->prepare($sql);
		$stmt->execute();

		while ($row = $stmt->fetch(PDO::FETCH_ASSOC, PDO::FETCH_ORI_NEXT)) {
			$add_arr[] = array(
				'pref'=> $row[pref],
				'add1'=> $row[add1],
				'add2'=> $row[add2],
				'kana1'=> $row[kana1],
				'kana2'=> $row[kana2]
			);
		}

		// JSON形式で出力
		header('Content-Type: application/json');
		echo json_encode($add_arr);

		exit;
	} catch (PDOException $e){
		return 'DBへ接続できないか、エラーです';
	}
	?>
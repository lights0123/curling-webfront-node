CSC Curling | Settings
<?php
global $auth;
if ($auth < 0) {
	gotopage('/login');
}
$items = [];
$items["General"] = ["<p>content</p>"];
if ($auth > 0) {
	ob_start();
	?>
	<link rel='stylesheet' type='text/css' href='css/dropzone.css'/>
	<script src="/js/dropzone.js"></script>
	<form action="/upload?dest=draws" class="dropzone" id="draws-spreadsheet">
		<div class="fallback">
			<input name="file" type="file" />
		</div>
	</form>
	<script>
		Dropzone.options.drawsSpreadsheet = {
			maxFilesize: 1,
			acceptedFiles: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
		}
	</script>
	<?php
	$items["Data"] = [ob_get_clean()];
}
if (isset($_GET['panel']) && in_array($_GET['panel'], array_keys($items))) {
	array_push($items[$_GET['panel']], true);
} else {
	array_push($items['General'], true);
}
?>
<link rel='stylesheet' type='text/css' href='css/interface.css'/>
<div>
	<ul>
		<?php
		foreach ($items as $key => $value) {
			$selected = (isset($value[1]) && $value[1] === true) ? ' id="selected"' : "";
			?>
			<li<?= $selected ?>>
				<a href="/settings?panel=<?php echo urlencode($key); ?>" class="autoexempt">
					<div></div>
					<span><?= $key ?></span>
				</a>
			</li>
			<?php
		}
		?>
	</ul>
</div>
<?php
/*foreach ($items as $key => $value) {
	$selected = (isset($value[1]) && $value[1] === true) ? ' id="selected-content"' : "";
	?>
	<div<?= $selected ?> data-com-curlcsc-settingpanel-id="<?php echo htmlspecialchars($key); ?>">
		<div>
			<?= $value[0] ?>
		</div>
	</div>
	<?php
}*/
foreach ($items as $key => $value) {
	$selected = isset($value[1]) && $value[1];
	if($selected) {
		?>
		<div id="selected-content" data-com-curlcsc-settingpanel-id="<?php echo htmlspecialchars($key); ?>">
			<div>
				<?= $value[0] ?>
			</div>
		</div>
		<?php
	}
}
?>
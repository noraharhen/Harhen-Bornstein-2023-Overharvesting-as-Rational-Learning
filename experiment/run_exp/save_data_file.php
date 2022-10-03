<?php
  // Get post data
  $post_data = json_decode(file_get_contents('php://input'), true);
  // Get file name and file data
  // Directory "data" must be writable by server
  $file_path = "data/".$post_data['file_name'];
  $file_data = $post_data['file_data'];
  // Remove quotation marks from file data
  str_replace('"', "", $file_data);
  // Write file to disk
  file_put_contents($file_path, $file_data);
?>

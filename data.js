var data = {};
data['back_port'] = 8000;
data['front_port'] = 3000;
data['back_connect'] = 'connection';
data['front_connect'] = 'connect';
data['full_message_list'] = 'full message list';
data['new_message'] = 'new message';
data['back_disconnect'] = 'disconnect';
data['front_disconnect'] = 'disconnection';
data['full_client_list'] = 'full client list';
data['client_connect'] = 'client connect';
data['client_disconnect'] = 'client disconnect';
data['max_file_size'] = 100 * 1024 * 1024;
data['max_age'] = 24 * 60 * 60 * 1000;
data['not_these_letters'] = ': \t';
data['min_id_len'] = 5;
data['min_pw_len'] = 5;
data['validate_id'] = (id) => {
  if (id.length < data['min_id_len'])
    return false;
  for (let i = 0; i < data['not_these_letters'].length; ++i) {
    if (id.includes(data['not_these_letters'][i]))
      return false;
  }
  return true;
}
data['validate_pw'] = (pw) => {
  if (pw.length < data['min_pw_len'])
    return false;
  for (let i = 0; i < data['not_these_letters'].length; ++i) {
    if (pw.includes(data['not_these_letters'][i]))
      return false;
  }
  return true;
}

exports.data = data;
// export default data;
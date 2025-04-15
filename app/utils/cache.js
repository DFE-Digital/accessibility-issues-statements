const cache = require('memory-cache');

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function get(key) {
  return cache.get(key);
}

function set(key, value, duration = CACHE_DURATION) {
  return cache.put(key, value, duration);
}

function del(key) {
  return cache.del(key);
}

function clear() {
  return cache.clear();
}

module.exports = {
  get,
  set,
  del,
  clear
}; 
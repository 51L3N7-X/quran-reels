const sleep = (time) =>
  new Promise((r) => {
    setTimeout(r, time);
  });

export default sleep;

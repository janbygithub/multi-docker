import React from 'react';
import { Link } from 'react-router-dom';

//export default () => { // Niektore verzie nepodporuju export anonymnych defaults

const reducer = () => {
  return (
    <div>
      Druha Stranka
      <Link to="/">Zpatky dom</Link>
    </div>
  );
};

export default reducer;

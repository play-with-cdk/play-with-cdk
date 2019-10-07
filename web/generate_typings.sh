#!/bin/bash

cd $1
rm out.js
echo "exports.alltypes = [" >> out.js
for file in `find * \( -name package.json -o -name "*.d.ts" \) -print`
do
  echo $file
  echo "{ name: 'file:///$1/$file', value: \`$(cat $file | base64 )\` }," >> out.js
done
echo "]" >> out.js

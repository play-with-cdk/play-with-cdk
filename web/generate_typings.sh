#!/bin/bash

mkdir tmp
cp ../lambda/package.json tmp
cp ../lambda/package-lock.json tmp
pushd tmp
npm ci
pushd "node_modules/@aws-cdk"
echo "exports.alltypes = [" >> typings.js
for file in `find * \( -name package.json -o -name "*.d.ts" \) -print`
do
  echo $file
  echo "{ name: 'file:///node_modules/@aws-cdk/$file', value: \`$(cat $file | base64 )\` }," >> typings.js
done
echo "]" >> typings.js
popd
popd
mv "tmp/node_modules/@aws-cdk/typings.js" .
rm -rf tmp
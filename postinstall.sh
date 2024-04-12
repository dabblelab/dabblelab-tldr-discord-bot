echo "Removing line 6 from node_modules/@langchain/openai/dist/utils/openai.d.ts"
sed -i '6d' "node_modules/@langchain/openai/dist/utils/openai.d.ts"
echo "Line removed..."

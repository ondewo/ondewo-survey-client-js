
#survey, vtsi, etc.
TARGET_PRODUCT_NAME="$1"
TARGET_ROOT_DIRECTORY="$2"

if [ ! -f "$TARGET_DIRECTORY" ]; then
    mkdir -p "$TARGET_DIRECTORY"
fi

API_REPO_NAME="ondewo-$TARGET_PRODUCT_NAME-api"

API_REPO_URL="https://github.com/ondewo/$API_REPO_NAME"

#TARGET_NAME=$(echo "$API_REPO_NAME" | sed "s/-api/-client-js/")
TARGET_NAME="ondewo-$TARGET_PRODUCT_NAME-client-js"

TARGET_REPO_URL="https://github.com/ondewo/$TARGET_NAME"

REPO_DIR="$TARGET_ROOT_DIRECTORY/TARGET_NAME"

mkdir -p "$REPO_DIR"

cat "$(dirname "$0")/package.json" | \
sed "s/survey/$TARGET_PRODUCT_NAME/g" \
> "$REPO_DIR/package.json"

cp "$(dirname "$0")/instantiate-js-repo.sh" "$REPO_DIR"
cp "$(dirname "$0")/.gitignore" "$REPO_DIR"

mkdir -p "$REPO_DIR/src"
cp "$(dirname "$0")/src/README.md" "$REPO_DIR/src"
cp "$(dirname "$0")/src/RELEASE.md" "$REPO_DIR/src"

mkdir -p "$REPO_DIR/example"

cp "$(dirname "$0")/example/src" "$REPO_DIR/example"
cp "$(dirname "$0")/example/index.html" "$REPO_DIR/example"
cp "$(dirname "$0")/example/client.js" "$REPO_DIR/example"

CWD=$(pwd)

cd "$REPO_DIR/src" || exit
git add submodule "$API_REPO_URL"
git submodule update --init --recursive --remote

cd "$REPO_DIR" || exit
git remote add origin "$TARGET_REPO_URL"

npm run build

git add -A
git commit -am "initial commit"
git push

cd "$CWD"
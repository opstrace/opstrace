package ddapi

import (
	"bytes"
	"compress/zlib"
	"io/ioutil"
)

func ZlibEncode(src []byte) ([]byte, error) {
	var b bytes.Buffer
	w := zlib.NewWriter(&b)
	_, err := w.Write(src)

	if err != nil {
		return nil, err
	}

	err = w.Close()
	if err != nil {
		return nil, err
	}

	return b.Bytes(), nil
}

func ZlibDecode(src []byte) ([]byte, error) {
	r, err := zlib.NewReader(bytes.NewReader(src))
	if err != nil {
		return nil, err
	}
	defer r.Close()

	dst, err := ioutil.ReadAll(r)

	if err != nil {
		return nil, err
	}

	return dst, nil
}

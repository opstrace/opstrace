// Copyright 2021 Opstrace, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
	return ioutil.ReadAll(r)
}

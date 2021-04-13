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

package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidateName_TooLong(t *testing.T) {
	assert.Error(t, ValidateName("thisisaverylongstring-thisisaverylongstring-thisisave"))
}

func TestValidateName_StartsWithDash(t *testing.T) {
	assert.Error(t, ValidateName("-testname123"))
}

func TestValidateName_EndsWithDash(t *testing.T) {
	assert.Error(t, ValidateName("testname123-"))
}

func TestValidateName_Uppercase(t *testing.T) {
	assert.Error(t, ValidateName("testName123"))
}

func TestValidateName_Underscore(t *testing.T) {
	assert.Error(t, ValidateName("test_name123"))
}

func TestValidateName_Period(t *testing.T) {
	assert.Error(t, ValidateName("test.name123"))
}

func TestValidateName_ExclamationMark(t *testing.T) {
	assert.Error(t, ValidateName("test!name123"))
}

func TestValidateName_Valid(t *testing.T) {
	assert.Nil(t, ValidateName("testname"))
	assert.Nil(t, ValidateName("123test-name123"))
	assert.Nil(t, ValidateName("test-name123"))
	assert.Nil(t, ValidateName("testname"))
	assert.Nil(t, ValidateName("thisisaverylongstring-thisisaverylongstring-thisisav"))
}

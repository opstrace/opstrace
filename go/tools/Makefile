all: cortex alertmanager loki

cortex:
	cd cortex-jsonschema-exporter && go mod download && go run cortex-config.go

alertmanager:
	cd cortex-jsonschema-exporter && go mod download && go run alertmanager-config.go

loki:
	cd loki-jsonschema-exporter && go mod download && go run main.go

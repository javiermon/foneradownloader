NAME=foneradownloader
VERSION=$(shell grep "<em:version>.*<\/em:version>" install.rdf | cut -d'<' -f2 | cut -d'>' -f2)
all:
	zip -r $(NAME)-$(VERSION).xpi * -x@exclude.lst

clean:
	rm -rf $(NAME)-$(VERSION).xpi
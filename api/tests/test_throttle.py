import pytest

from app.codes import Code
from app.observation.throttle import READS, WINDOW, admit, clear_reads


def test_one_client_cannot_storm_and_another_still_can():
    clear_reads()
    for _ in range(READS):
        admit("one", now=10)
    with pytest.raises(ValueError) as caught:
        admit("one", now=10)
    assert str(caught.value) == Code.BUSY
    admit("two", now=10)


def test_a_read_older_than_the_window_no_longer_counts():
    clear_reads()
    for _ in range(READS):
        admit("one", now=10)
    admit("one", now=10 + WINDOW)
